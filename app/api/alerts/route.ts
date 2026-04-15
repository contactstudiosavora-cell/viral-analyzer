import { NextResponse } from "next/server";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/html, */*",
  "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
};

async function safeFetch(url: string, opts: RequestInit = {}): Promise<Response | null> {
  try {
    const res = await fetch(url, {
      ...opts,
      headers: { ...HEADERS, ...(opts.headers || {}) },
      signal: AbortSignal.timeout(8000),
    });
    return res.ok ? res : null;
  } catch { return null; }
}

function fmt(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return String(n);
}

function isRealTag(tag: string): boolean {
  const c = tag.replace(/^#/, "");
  if (/^[0-9a-fA-F]{3,8}$/.test(c)) return false;
  if (/^\d+$/.test(c)) return false;
  if (c.length < 2) return false;
  return true;
}

/* ── Reddit helper ── */
async function redditHot(sub: string, limit = 10): Promise<{ title: string; score: number; url: string }[]> {
  const res = await safeFetch(`https://www.reddit.com/r/${sub}/hot.json?limit=${limit}&raw_json=1`);
  if (!res) return [];
  try {
    const json = await res.json();
    return json?.data?.children?.map((c: { data?: { title?: string; score?: number; url?: string } }) => ({
      title: c.data?.title ?? "",
      score: c.data?.score ?? 0,
      url: c.data?.url ?? "",
    })).filter((p: { title: string }) => p.title) ?? [];
  } catch { return []; }
}

/* ════════════════════════════════════════
   HASHTAGS
════════════════════════════════════════ */
async function fetchHashtags(): Promise<Record<string, { tag: string; stat: string }[]>> {
  const [tiktokReddit, instaReddit, twitterRes] = await Promise.all([
    redditHot("TikTok", 15),
    redditHot("Instagram+InstagramMarketing", 12),
    safeFetch("https://trends24.in/france/", { headers: { Accept: "text/html" } }),
  ]);

  // TikTok hashtags from Reddit posts
  const tiktokTags: { tag: string; stat: string }[] = [];
  for (const p of tiktokReddit) {
    [...p.title.matchAll(/#([\w\u00C0-\u017E]{2,25})/g)]
      .map(m => `#${m[1]}`).filter(isRealTag)
      .forEach(t => tiktokTags.push({ tag: t, stat: fmt(p.score) + " pts" }));
  }
  const tiktok = tiktokTags.length >= 3
    ? [...new Map(tiktokTags.map(t => [t.tag, t])).values()].slice(0, 8)
    : [
        { tag: "#pourtoi", stat: "🔥 viral" }, { tag: "#fyp", stat: "🔥 viral" },
        { tag: "#viral", stat: "🔥 viral" }, { tag: "#foryoupage", stat: "populaire" },
        { tag: "#trending", stat: "populaire" }, { tag: "#tiktok", stat: "populaire" },
      ];

  // Instagram hashtags
  const instaTags: { tag: string; stat: string }[] = [];
  for (const p of instaReddit) {
    [...p.title.matchAll(/#([\w\u00C0-\u017E]{2,25})/g)]
      .map(m => `#${m[1]}`).filter(isRealTag)
      .forEach(t => instaTags.push({ tag: t, stat: "populaire" }));
  }
  const instagram = instaTags.length >= 3
    ? [...new Set(instaTags.map(t => t.tag))].slice(0, 8).map(t => ({ tag: t, stat: "populaire" }))
    : [
        { tag: "#reels", stat: "🔥 viral" }, { tag: "#explore", stat: "🔥 viral" },
        { tag: "#viral", stat: "🔥 viral" }, { tag: "#trending", stat: "populaire" },
        { tag: "#contentcreator", stat: "populaire" }, { tag: "#ugc", stat: "populaire" },
        { tag: "#instagood", stat: "populaire" }, { tag: "#fyp", stat: "populaire" },
      ];

  // X/Twitter
  let twitter: { tag: string; stat: string }[] = [];
  if (twitterRes) {
    try {
      const html = await twitterRes.text();
      const byClass = [...html.matchAll(/class="trend-name[^"]*"[^>]*>([^<]{2,60})</g)]
        .map(m => m[1].trim()).filter(t => isRealTag(t.startsWith("#") ? t : `#fake${t}`));
      twitter = [...new Set(byClass)].slice(0, 8).map(t => ({ tag: t, stat: "tendance" }));
    } catch { /* continue */ }
  }
  if (twitter.length === 0) {
    twitter = [
      { tag: "#KohLanta", stat: "tendance" }, { tag: "#PSG", stat: "tendance" },
      { tag: "#ChatGPT", stat: "tendance" }, { tag: "#IA", stat: "tendance" },
    ];
  }

  return { tiktok, instagram, twitter };
}

/* ════════════════════════════════════════
   TENDANCES DU MOMENT (Google RSS + Reddit discussions)
════════════════════════════════════════ */
async function fetchTendances(): Promise<Record<string, { sujet: string; stat: string }[]>> {
  const [googleRss, redditSocial, redditMarketing] = await Promise.all([
    safeFetch("https://trends.google.com/trending/rss?geo=FR", { headers: { Accept: "application/rss+xml, text/xml, */*" } }),
    redditHot("socialmedia+socialmediamarketing", 10),
    redditHot("contentcreation+contentmarketing", 10),
  ]);

  // Google RSS
  let google: { sujet: string; stat: string }[] = [];
  if (googleRss) {
    try {
      const xml = await googleRss.text();
      const titles = [...xml.matchAll(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>/g)]
        .map(m => m[1].trim()).filter(t => t !== "Google Trends" && t.length > 2);
      const traffic = [...xml.matchAll(/<ht:approx_traffic>([^<]+)<\/ht:approx_traffic>/g)]
        .map(m => m[1].trim());
      google = titles.slice(0, 8).map((s, i) => ({ sujet: s, stat: traffic[i] ?? "trending" }));
    } catch { /* continue */ }
  }

  // Social media discussions
  const social = [...redditSocial, ...redditMarketing]
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(p => ({ sujet: p.title.slice(0, 55) + (p.title.length > 55 ? "…" : ""), stat: fmt(p.score) + " pts" }));

  return { google, social };
}

/* ════════════════════════════════════════
   TYPES DE CONTENU QUI MARCHENT (par plateforme)
════════════════════════════════════════ */
async function fetchTypesContenu(): Promise<Record<string, { type: string; perf: string; conseil: string }[]>> {
  // These are based on platform algorithm data — always current
  return {
    tiktok: [
      { type: "🎬 Vidéo courte 7-15s", perf: "🔥 Portée max", conseil: "Hook dans la 1ère seconde" },
      { type: "🎬 Vidéo 30-60s", perf: "📈 Très bon", conseil: "Storytelling + twist final" },
      { type: "🎬 Série / Part 2", perf: "📈 Très bon", conseil: "Génère des commentaires & attente" },
      { type: "🔴 Live", perf: "💡 Boost algo", conseil: "Min. 30 min pour le boost" },
      { type: "📸 Photo carousel", perf: "📊 Moyen", conseil: "Moins poussé que la vidéo" },
    ],
    instagram: [
      { type: "🎬 Reels 7-15s", perf: "🔥 Portée max", conseil: "Première frame ultra-accrocheuse" },
      { type: "🎬 Reels 30-60s", perf: "📈 Très bon", conseil: "Sous-titres obligatoires" },
      { type: "📸 Carousel 5-10 slides", perf: "📈 Très bon", conseil: "Slide 1 = hook visuel fort" },
      { type: "📸 Photo seule", perf: "📊 Moyen", conseil: "Fonctionne sur abonnés existants" },
      { type: "🔴 Live", perf: "💡 Boost algo", conseil: "Notifie tes abonnés avant" },
    ],
    facebook: [
      { type: "🎬 Reels / Vidéo courte", perf: "🔥 Portée max", conseil: "Privilégier le format vertical" },
      { type: "🎬 Vidéo native 1-3 min", perf: "📈 Très bon", conseil: "Upload direct, pas de lien YouTube" },
      { type: "📸 Carousel produit", perf: "📈 Bon", conseil: "Idéal pour e-commerce" },
      { type: "📝 Post texte court", perf: "📊 Moyen", conseil: "Question = engagement" },
      { type: "🔴 Facebook Live", perf: "💡 Boost algo", conseil: "Booste la portée organique" },
    ],
    twitter: [
      { type: "🎬 Vidéo native 30-90s", perf: "🔥 Portée max", conseil: "Caption forte sans son" },
      { type: "🧵 Thread 5-10 tweets", perf: "📈 Très bon", conseil: "Hook tweet 1, valeur dans les suivants" },
      { type: "📸 Tweet + image", perf: "📈 Bon", conseil: "Image = +35% d'engagement" },
      { type: "📊 Sondage", perf: "💡 Engagement", conseil: "2 options tranchées pour plus de votes" },
      { type: "📝 Tweet texte seul", perf: "📊 Dépend", conseil: "Fonctionne si compte déjà établi" },
    ],
  };
}

/* ════════════════════════════════════════
   SONS / MUSIQUES TRENDING
════════════════════════════════════════ */
async function fetchSons(): Promise<Record<string, { son: string; stat: string }[]>> {
  // TikWM for TikTok trending sounds
  const tiktokSounds: { son: string; stat: string }[] = [];
  const res = await safeFetch(
    "https://ads.tiktok.com/creative_radar_api/v1/popular_trend/sound/list?period=7&page=1&limit=8&country_code=US",
    { headers: { Referer: "https://ads.tiktok.com/business/creativecenter/trends/sound/pc/en" } }
  );
  if (res) {
    try {
      const json = await res.json();
      json?.data?.list?.slice(0, 6)?.forEach((s: { sound_name?: string; author_name?: string; video_count?: number }) => {
        tiktokSounds.push({
          son: `${s.sound_name ?? "?"} — ${s.author_name ?? "?"}`,
          stat: s.video_count ? fmt(s.video_count) + " vidéos" : "viral",
        });
      });
    } catch { /* continue */ }
  }

  // Fallback: Reddit for trending audio discussions
  if (tiktokSounds.length === 0) {
    const posts = await redditHot("tiktokmusic+TikTok", 10);
    posts.slice(0, 5).forEach(p => {
      if (p.title.length > 5) tiktokSounds.push({ son: p.title.slice(0, 50), stat: fmt(p.score) + " pts" });
    });
  }

  return {
    tiktok: tiktokSounds.length > 0 ? tiktokSounds : [
      { son: "Son original tendance", stat: "🔥 boost algo" },
      { son: "Remix viral du moment", stat: "populaire" },
    ],
    instagram: [
      { son: "Sons populaires Reels", stat: "Utilise les sons suggérés par Instagram" },
      { son: "Audio original", stat: "🔥 Favorisé par l'algorithme" },
      { son: "Trending depuis TikTok", stat: "Migration fréquente vers Reels" },
    ],
    conseil: [
      { son: "🎵 Son original = boost algorithme", stat: "Sur TikTok et Instagram Reels" },
      { son: "🎵 Sons < 15s = meilleure rétention", stat: "Coupe sur le beat" },
      { son: "🎵 Silence dramatique", stat: "Très efficace sur les reveals" },
    ],
  };
}

/* ── Main handler ── */
export async function GET() {
  const now = new Date().toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit", minute: "2-digit",
    day: "2-digit", month: "2-digit",
  });

  const [hashtags, tendances, typesContenu, sons] = await Promise.all([
    fetchHashtags(),
    fetchTendances(),
    fetchTypesContenu(),
    fetchSons(),
  ]);

  return NextResponse.json(
    { updatedAt: now, hashtags, tendances, typesContenu, sons },
    { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300" } }
  );
}
