import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const execFileAsync = promisify(execFile);
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/* ── Get ffmpeg path (bundled via @ffmpeg-installer) ── */
function getFfmpegPath(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const installer = require("@ffmpeg-installer/ffmpeg");
    return installer.path;
  } catch {
    return "ffmpeg"; // fallback to system ffmpeg
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

/* ── Get direct video URL via cobalt.tools ── */
async function getDirectVideoUrl(url: string): Promise<string> {
  const res = await fetch("https://api.cobalt.tools/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ url }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) throw new Error(`cobalt.tools erreur ${res.status}`);

  const data = await res.json();

  if (data.status === "error") {
    throw new Error(data.error?.code || data.text || "Lien non supporté");
  }

  if (data.url) return data.url;
  if (data.tunnel) return data.tunnel;

  if (data.status === "picker" && Array.isArray(data.picker)) {
    const video = data.picker.find(
      (p: { type?: string; url?: string }) => p.type === "video" || p.url
    );
    if (video?.url) return video.url;
  }

  throw new Error("Impossible d'extraire l'URL directe");
}

/* ── Download video from direct URL ── */
async function downloadFromUrl(directUrl: string, destPath: string): Promise<void> {
  const res = await fetch(directUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) throw new Error(`Téléchargement échoué : HTTP ${res.status}`);

  const buffer = await res.arrayBuffer();
  if (buffer.byteLength < 5_000) throw new Error("Vidéo inaccessible ou trop petite");

  fs.writeFileSync(destPath, Buffer.from(buffer));
}

/* ── Get video duration via ffprobe ── */
async function getVideoDuration(videoPath: string): Promise<number> {
  try {
    const ffprobePath = FFMPEG.replace(/ffmpeg(\.exe)?$/, "ffprobe$1");
    const { stdout } = await execFileAsync(ffprobePath, [
      "-v", "quiet",
      "-print_format", "json",
      "-show_format",
      videoPath,
    ]);
    const info = JSON.parse(stdout);
    return parseFloat(info.format?.duration) || 30;
  } catch {
    return 30;
  }
}

/* ── Extract frames using bundled ffmpeg ── */
async function extractFrames(videoPath: string, framesDir: string): Promise<string[]> {
  const duration = await getVideoDuration(videoPath);
  const frameCount = 6;
  const framePaths: string[] = [];

  for (let i = 1; i <= frameCount; i++) {
    const ts = ((duration / (frameCount + 1)) * i).toFixed(2);
    const fp = path.join(framesDir, `frame_${i}.jpg`);

    try {
      await execFileAsync(FFMPEG, [
        "-ss", ts,
        "-i", videoPath,
        "-vframes", "1",
        "-q:v", "2",
        "-y",
        fp,
      ], { timeout: 15_000 });

      if (fs.existsSync(fp)) framePaths.push(fp);
    } catch {
      // skip frame on error
    }
  }

  return framePaths;
}

/* ── Claude Vision analysis ── */
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

  const perfContext =
    performance === "viral"
      ? "Cette vidéo a très bien performé. Analyse POURQUOI elle a marché."
      : performance === "flop"
      ? "Cette vidéo n'a pas marché. Analyse POURQUOI elle a échoué et ce qu'il faudrait changer."
      : "Cette vidéo n'a pas encore été postée. Donne un score de viralité et des recommandations avant publication.";

  const ctxBlock = context?.trim() ? `\nPRÉCISIONS : ${context}` : "";

  const prompt = `Tu es un expert en analyse de contenu viral sur les réseaux sociaux.

PLATEFORME : ${platform}
SITUATION : ${perfContext}${ctxBlock}

Je t'envoie ${framePaths.length} frames extraites dans l'ordre chronologique de la vidéo.
Base ton analyse UNIQUEMENT sur ce que tu vois réellement dans les frames + le contexte fourni.

Réponds UNIQUEMENT en JSON valide :

{
  "plateforme": "${platform}",
  "verdict": "${performance === "viral" ? "✅ Vidéo virale" : performance === "flop" ? "❌ Vidéo en échec" : "🔍 Analyse pré-publication"}",
  "score_viralite": { "note": 7, "label": "Bon potentiel", "explication": "Explication courte" },
  "hook": { "arrete_scroll": true, "score": 8, "analyse": "Analyse de la première frame", "technique": "Technique identifiée" },
  "structure": { "rythme": "Analyse du rythme", "clarte": "Clarté du message", "storytelling": "Arc narratif" },
  "diagnostic_performance": {
    "raisons_principales": ["Raison 1", "Raison 2", "Raison 3"],
    "facteur_cle": "Le facteur le plus déterminant"
  },
  "points_forts": ["Point fort 1", "Point fort 2"],
  "points_faibles": ["Point faible 1", "Point faible 2", "Point faible 3"],
  "optimisations": [
    { "element": "Hook", "probleme": "Ce qui ne marche pas", "solution": "Comment corriger" },
    { "element": "Rythme", "probleme": "Ce qui ne marche pas", "solution": "Comment corriger" },
    { "element": "CTA", "probleme": "Ce qui manque", "solution": "Recommandation" }
  ],
  "verdict_final": "Synthèse directe en 2-3 phrases",
  "bonus": {
    "hooks_optimises": ["Hook 1", "Hook 2", "Hook 3"],
    "idee_video": "Comment retourner ce contenu sous un angle plus viral"
  }
}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: [...imageBlocks, { type: "text", text: prompt }],
      },
    ],
  });

  const raw = (message.content[0] as { type: string; text: string }).text.trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Erreur de parsing JSON");
  return JSON.parse(jsonMatch[0]);
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
        directUrl = await getDirectVideoUrl(url);
      } catch (e) {
        return NextResponse.json(
          { error: `Lien non supporté. Essaie d'uploader la vidéo directement.\n\nDétail : ${e instanceof Error ? e.message : String(e)}` },
          { status: 422 }
        );
      }

      try {
        await downloadFromUrl(directUrl, videoPath);
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
        { error: "Impossible d'extraire les frames. Essaie un autre format de vidéo." },
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
