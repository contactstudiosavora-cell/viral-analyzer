import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const execFileAsync = promisify(execFile);
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/* ── Get ffmpeg path (bundled) ── */
function getFfmpegPath(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("@ffmpeg-installer/ffmpeg").path;
  } catch {
    return "ffmpeg";
  }
}
const FFMPEG = getFfmpegPath();

/* ── Platform detection ── */
function detectPlatform(url: string): string {
  if (url.includes("tiktok")) return "TikTok";
  if (url.includes("instagram") || url.includes("reel")) return "Instagram";
  if (url.includes("facebook") || url.includes("fb.watch")) return "Facebook";
  if (url.includes("twitter") || url.includes("x.com")) return "X (Twitter)";
  if (url.includes("youtube") || url.includes("youtu.be")) return "YouTube";
  return "Social Media";
}

/* ── Clean tracking params from URL ── */
function cleanUrl(url: string): string {
  try {
    const u = new URL(url);
    ["is_from_webapp", "sender_device", "sender_web_id", "web_id",
      "utm_source", "utm_medium", "utm_campaign", "refer", "source"].forEach(
      (p) => u.searchParams.delete(p)
    );
    return u.toString();
  } catch {
    return url;
  }
}

/* ────────────────────────────────────────
   METHOD 1 — TikWM (TikTok only, free)
──────────────────────────────────────── */
async function getTikTokDirectUrl(url: string): Promise<string> {
  const res = await fetch(
    `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`,
    {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(15_000),
    }
  );
  if (!res.ok) throw new Error(`tikwm ${res.status}`);
  const data = await res.json();
  if (data.code !== 0) throw new Error(data.msg || "tikwm error");
  // prefer no-watermark
  const videoUrl = data.data?.play || data.data?.wmplay;
  if (!videoUrl) throw new Error("tikwm: no video URL in response");
  return videoUrl;
}

/* ────────────────────────────────────────
   METHOD 2 — Cobalt.tools (all platforms)
──────────────────────────────────────── */
async function getCobaltDirectUrl(url: string): Promise<string> {
  const clean = cleanUrl(url);

  const res = await fetch("https://api.cobalt.tools/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ url: clean }),
    signal: AbortSignal.timeout(25_000),
  });

  const text = await res.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`cobalt parse error: ${text.slice(0, 100)}`);
  }

  if (!res.ok || data.status === "error") {
    throw new Error(
      (data.error as { code?: string } | undefined)?.code ||
        (data.text as string) ||
        `cobalt ${res.status}`
    );
  }

  if (data.url) return data.url as string;
  if (data.tunnel) return data.tunnel as string;

  if (data.status === "picker" && Array.isArray(data.picker)) {
    const video = (data.picker as { type?: string; url?: string }[]).find(
      (p) => p.type === "video" || p.url
    );
    if (video?.url) return video.url;
  }

  throw new Error("cobalt: no URL in response");
}

/* ────────────────────────────────────────
   MAIN RESOLVER — tries best method first
──────────────────────────────────────── */
async function getDirectVideoUrl(url: string, platform: string): Promise<string> {
  const errors: string[] = [];

  // TikTok → try tikwm first (most reliable)
  if (platform === "TikTok") {
    try {
      return await getTikTokDirectUrl(url);
    } catch (e) {
      errors.push(`tikwm: ${e instanceof Error ? e.message : e}`);
    }
  }

  // All platforms → try cobalt
  try {
    return await getCobaltDirectUrl(url);
  } catch (e) {
    errors.push(`cobalt: ${e instanceof Error ? e.message : e}`);
  }

  throw new Error(`Impossible de télécharger la vidéo.\n${errors.join(" | ")}`);
}

/* ── Download video binary ── */
async function downloadVideo(directUrl: string, destPath: string): Promise<void> {
  const res = await fetch(directUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
      Referer: "https://www.tiktok.com/",
    },
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) throw new Error(`Download HTTP ${res.status}`);
  const buffer = await res.arrayBuffer();
  if (buffer.byteLength < 5_000) throw new Error("Fichier trop petit, vidéo inaccessible");
  fs.writeFileSync(destPath, Buffer.from(buffer));
}

/* ── Get video duration via ffprobe ── */
async function getVideoDuration(videoPath: string): Promise<number> {
  try {
    const ffprobePath = FFMPEG.replace(/ffmpeg(\.exe)?$/, "ffprobe$1");
    const { stdout } = await execFileAsync(ffprobePath, [
      "-v", "quiet", "-print_format", "json", "-show_format", videoPath,
    ]);
    return parseFloat(JSON.parse(stdout).format?.duration) || 30;
  } catch {
    return 30;
  }
}

/* ── Extract 6 frames ── */
async function extractFrames(videoPath: string, framesDir: string): Promise<string[]> {
  const duration = await getVideoDuration(videoPath);
  const frameCount = 6;
  const framePaths: string[] = [];

  for (let i = 1; i <= frameCount; i++) {
    const ts = ((duration / (frameCount + 1)) * i).toFixed(2);
    const fp = path.join(framesDir, `frame_${i}.jpg`);
    try {
      await execFileAsync(
        FFMPEG,
        ["-ss", ts, "-i", videoPath, "-vframes", "1", "-q:v", "2", "-y", fp],
        { timeout: 15_000 }
      );
      if (fs.existsSync(fp)) framePaths.push(fp);
    } catch { /* skip */ }
  }

  return framePaths;
}

/* ── Claude Vision ── */
async function analyzeWithClaude(
  framePaths: string[],
  platform: string,
  performance: string,
  context: string
): Promise<object> {
  const imageBlocks = framePaths.map((fp) => ({
    type: "image" as const,
    source: {
      type: "base64" as const,
      media_type: "image/jpeg" as const,
      data: fs.readFileSync(fp).toString("base64"),
    },
  }));

  const perfCtx =
    performance === "viral"
      ? "Cette vidéo a très bien performé. Analyse POURQUOI elle a marché."
      : performance === "flop"
      ? "Cette vidéo n'a pas marché. Analyse POURQUOI elle a échoué et ce qu'il faudrait changer."
      : "Cette vidéo n'a pas encore été postée. Donne un score de viralité et des recommandations.";

  const prompt = `Tu es un expert en analyse de contenu viral sur les réseaux sociaux.

PLATEFORME : ${platform}
SITUATION : ${perfCtx}
${context?.trim() ? `PRÉCISIONS : ${context}` : ""}

Je t'envoie ${framePaths.length} frames dans l'ordre chronologique.
Base ton analyse UNIQUEMENT sur ce que tu vois réellement.

Réponds UNIQUEMENT en JSON valide :
{
  "plateforme": "${platform}",
  "verdict": "${performance === "viral" ? "✅ Vidéo virale" : performance === "flop" ? "❌ Vidéo en échec" : "🔍 Analyse pré-publication"}",
  "score_viralite": { "note": 7, "label": "Bon potentiel", "explication": "Explication courte" },
  "hook": { "arrete_scroll": true, "score": 8, "analyse": "Analyse", "technique": "Technique" },
  "structure": { "rythme": "Rythme", "clarte": "Clarté", "storytelling": "Storytelling" },
  "diagnostic_performance": {
    "raisons_principales": ["Raison 1", "Raison 2", "Raison 3"],
    "facteur_cle": "Facteur clé"
  },
  "points_forts": ["Point 1", "Point 2"],
  "points_faibles": ["Point 1", "Point 2", "Point 3"],
  "optimisations": [
    { "element": "Hook", "probleme": "Problème", "solution": "Solution" },
    { "element": "Rythme", "probleme": "Problème", "solution": "Solution" },
    { "element": "CTA", "probleme": "Problème", "solution": "Solution" }
  ],
  "verdict_final": "Synthèse en 2-3 phrases",
  "bonus": {
    "hooks_optimises": ["Hook 1", "Hook 2", "Hook 3"],
    "idee_video": "Idée pour retourner ce contenu"
  }
}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2048,
    messages: [{ role: "user", content: [...imageBlocks, { type: "text", text: prompt }] }],
  });

  const raw = (message.content[0] as { type: string; text: string }).text.trim();
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Erreur de parsing JSON");
  return JSON.parse(match[0]);
}

/* ── Main handler ── */
export async function POST(req: NextRequest) {
  const tempDir = path.join(os.tmpdir(), `viral-${Date.now()}`);

  try {
    fs.mkdirSync(tempDir, { recursive: true });
    const framesDir = path.join(tempDir, "frames");
    fs.mkdirSync(framesDir);

    const contentType = req.headers.get("content-type") || "";
    let videoPath = "";
    let platform = "Social Media";
    let performance = "unknown";
    let context = "";

    /* ── FILE UPLOAD ── */
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("video") as File;
      performance = (formData.get("performance") as string) || "unknown";
      context = (formData.get("context") as string) || "";
      platform = (formData.get("platform") as string) || "Social Media";

      if (!file) return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });

      const ext = file.name.split(".").pop() || "mp4";
      videoPath = path.join(tempDir, `video.${ext}`);
      fs.writeFileSync(videoPath, Buffer.from(await file.arrayBuffer()));

    /* ── URL ── */
    } else {
      const body = await req.json();
      const { url, context: ctx, performance: perf } = body;
      performance = perf || "unknown";
      context = ctx || "";

      if (!url?.trim()) return NextResponse.json({ error: "URL requise" }, { status: 400 });

      platform = detectPlatform(url);
      videoPath = path.join(tempDir, "video.mp4");

      let directUrl: string;
      try {
        directUrl = await getDirectVideoUrl(url, platform);
      } catch (e) {
        return NextResponse.json(
          { error: `Impossible de télécharger cette vidéo. Essaie l'onglet Upload à la place.\n\nDétail : ${e instanceof Error ? e.message : String(e)}` },
          { status: 422 }
        );
      }

      try {
        await downloadVideo(directUrl, videoPath);
      } catch (e) {
        return NextResponse.json(
          { error: `Téléchargement échoué : ${e instanceof Error ? e.message : String(e)}` },
          { status: 500 }
        );
      }
    }

    if (!fs.existsSync(videoPath)) {
      return NextResponse.json({ error: "Vidéo introuvable après téléchargement" }, { status: 500 });
    }

    const framePaths = await extractFrames(videoPath, framesDir);

    if (framePaths.length === 0) {
      return NextResponse.json(
        { error: "Impossible d'extraire les frames. Essaie l'onglet Upload." },
        { status: 500 }
      );
    }

    const analysis = await analyzeWithClaude(framePaths, platform, performance, context);
    return NextResponse.json({ analysis, platform, performance, framesAnalyzed: framePaths.length });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("analyze/video error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}
