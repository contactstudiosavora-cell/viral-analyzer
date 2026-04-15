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

async function redditHot(sub: string, limit = 10): Promise<{ title: string; score: number }[]> {
  const res = await safeFetch(`https://www.reddit.com/r/${sub}/hot.json?limit=${limit}&raw_json=1`);
  if (!res) return [];
  try {
    const json = await res.json();
    return json?.data?.children?.map((c: { data?: { title?: string; score?: number } }) => ({
      title: c.data?.title ?? "",
      score: c.data?.score ?? 0,
    })).filter((p: { title: string }) => p.title.length > 5) ?? [];
  } catch { return []; }
}

/* ════════════════════════════════════════
   GOOGLE TRENDS — RSS France
════════════════════════════════════════ */
async function fetchGoogleTrends(): Promise<{ sujet: string; stat: string }[]> {
  const res = await safeFetch(
    "https://trends.google.com/trending/rss?geo=FR",
    { headers: { Accept: "application/rss+xml, text/xml, */*" } }
  );
  if (res) {
    try {
      const xml = await res.text();
      const titles = [...xml.matchAll(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>/g)]
        .map(m => m[1].trim()).filter(t => t !== "Google Trends" && t.length > 2);
      const traffic = [...xml.matchAll(/<ht:approx_traffic>([^<]+)<\/ht:approx_traffic>/g)]
        .map(m => m[1].trim());
      if (titles.length > 0) {
        return titles.slice(0, 10).map((s, i) => ({ sujet: s, stat: traffic[i] ?? "trending" }));
      }
    } catch { /* continue */ }
  }

  // Fallback: daily trends JSON
  const res2 = await safeFetch(
    "https://trends.google.com/trends/api/dailytrends?hl=fr&tz=-60&geo=FR&ns=15",
    { headers: { Accept: "text/plain" } }
  );
  if (res2) {
    try {
      const text = await res2.text();
      const json = JSON.parse(text.replace(/^\)\]\}',?\n/, ""));
      const results = json?.default?.trendingSearchesDays?.[0]?.trendingSearches
        ?.slice(0, 10)
        ?.map((t: { title?: { query?: string }; formattedTraffic?: string }) => ({
          sujet: t.title?.query ?? "",
          stat: t.formattedTraffic ?? "trending",
        }))
        .filter((t: { sujet: string }) => t.sujet.length > 0) ?? [];
      if (results.length > 0) return results;
    } catch { /* continue */ }
  }

  return [];
}

/* ════════════════════════════════════════
   TENDANCES PAR PLATEFORME
════════════════════════════════════════ */
async function fetchTendances() {
  const [googleData, redditTiktok, redditInsta, redditTwitter, redditFb, redditGeneral] = await Promise.all([
    fetchGoogleTrends(),
    redditHot("TikTok+TikTokTips", 12),
    redditHot("Instagram+InstagramMarketing+reels", 12),
    redditHot("twitter+Twittermarketing", 10),
    redditHot("facebook+FacebookMarketing", 10),
    redditHot("socialmediamarketing+contentcreation+contentmarketing", 12),
  ]);

  const toItems = (posts: { title: string; score: number }[]) =>
    posts.sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(p => ({ sujet: p.title.length > 60 ? p.title.slice(0, 60) + "…" : p.title, stat: fmt(p.score) + " pts" }));

  const tiktokItems = toItems(redditTiktok);
  const instaItems = toItems(redditInsta);
  const twitterItems = toItems(redditTwitter);
  const fbItems = toItems(redditFb);
  const generalItems = toItems(redditGeneral);

  return {
    google: googleData,
    tiktok: tiktokItems.length > 0 ? tiktokItems : googleData.slice(0, 5),
    instagram: instaItems.length > 0 ? instaItems : googleData.slice(0, 5),
    twitter: twitterItems.length > 0 ? twitterItems : googleData.slice(0, 5),
    facebook: fbItems.length > 0 ? fbItems : generalItems.slice(0, 5),
    general: generalItems.length > 0 ? generalItems : googleData.slice(0, 5),
  };
}

/* ════════════════════════════════════════
   HASHTAGS
════════════════════════════════════════ */
async function fetchHashtags() {
  const [redditTiktok, redditInsta, twitterRes] = await Promise.all([
    redditHot("TikTok", 15),
    redditHot("Instagram+InstagramMarketing", 12),
    safeFetch("https://trends24.in/france/", { headers: { Accept: "text/html" } }),
  ]);

  // TikTok
  const tiktokTags: { tag: string; stat: string }[] = [];
  for (const p of redditTiktok) {
    [...p.title.matchAll(/#([\w\u00C0-\u017E]{2,25})/g)]
      .map(m => `#${m[1]}`).filter(isRealTag)
      .forEach(t => tiktokTags.push({ tag: t, stat: fmt(p.score) + " pts" }));
  }
  const tiktok = tiktokTags.length >= 4
    ? [...new Map(tiktokTags.map(t => [t.tag, t])).values()].slice(0, 8)
    : [
        { tag: "#pourtoi", stat: "🔥 viral" }, { tag: "#fyp", stat: "🔥 viral" },
        { tag: "#viral", stat: "🔥 viral" }, { tag: "#foryoupage", stat: "populaire" },
        { tag: "#trending", stat: "populaire" }, { tag: "#tiktok", stat: "populaire" },
        { tag: "#contentcreator", stat: "populaire" }, { tag: "#ugc", stat: "populaire" },
      ];

  // Instagram
  const instaTags: { tag: string; stat: string }[] = [];
  for (const p of redditInsta) {
    [...p.title.matchAll(/#([\w\u00C0-\u017E]{2,25})/g)]
      .map(m => `#${m[1]}`).filter(isRealTag)
      .forEach(t => instaTags.push({ tag: t, stat: "populaire" }));
  }
  const instagram = instaTags.length >= 4
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
        .map(m => m[1].trim()).filter(t => isRealTag(t.startsWith("#") ? t : `#x${t}`));
      if (byClass.length > 0) twitter = [...new Set(byClass)].slice(0, 8).map(t => ({ tag: t, stat: "tendance" }));
    } catch { /* continue */ }
  }
  if (twitter.length === 0) {
    twitter = [
      { tag: "#IA", stat: "tendance" }, { tag: "#Tech", stat: "tendance" },
      { tag: "#Marketing", stat: "tendance" }, { tag: "#Réseaux", stat: "tendance" },
    ];
  }

  return { tiktok, instagram, twitter };
}

/* ════════════════════════════════════════
   FORMATS / TYPES DE CONTENU
════════════════════════════════════════ */
function fetchTypesContenu() {
  return {
    tiktok: [
      { type: "🎬 Vidéo 7-15s", perf: "🔥 Portée maximale", conseil: "Hook dans la 1ère seconde, pas de générique" },
      { type: "🎬 Vidéo 30-60s", perf: "📈 Très bon", conseil: "Storytelling + twist ou révélation finale" },
      { type: "🎬 Série / Part 2…", perf: "📈 Très bon", conseil: "Génère de l'attente et des commentaires" },
      { type: "🎬 Duet / Stitch", perf: "💡 Boost reach", conseil: "Réagir à un contenu viral existant" },
      { type: "🔴 Live", perf: "💡 Boost algo", conseil: "Minimum 30 min pour déclencher le boost" },
      { type: "📸 Photo carousel", perf: "📊 Moyen", conseil: "Moins poussé que la vidéo sur TikTok" },
    ],
    instagram: [
      { type: "🎬 Reels 7-15s", perf: "🔥 Portée maximale", conseil: "Première frame ultra-accrocheuse" },
      { type: "🎬 Reels 30-60s", perf: "📈 Très bon", conseil: "Sous-titres obligatoires, 80% regardent sans son" },
      { type: "📸 Carousel 5-10 slides", perf: "📈 Très bon", conseil: "Slide 1 = hook visuel, dernière slide = CTA" },
      { type: "📸 Photo seule", perf: "📊 Moyen", conseil: "Fonctionne surtout pour les abonnés existants" },
      { type: "💬 Stories interactives", perf: "💡 Engagement", conseil: "Sondage + question = boost algorithme" },
      { type: "🔴 Live", perf: "💡 Boost algo", conseil: "Notifie tes abonnés 24h avant" },
    ],
    facebook: [
      { type: "🎬 Reels / Vidéo courte", perf: "🔥 Portée maximale", conseil: "Format vertical, upload direct sur Facebook" },
      { type: "🎬 Vidéo native 1-3 min", perf: "📈 Très bon", conseil: "Upload direct, jamais un lien YouTube" },
      { type: "📸 Carousel produit", perf: "📈 Bon", conseil: "Idéal e-commerce, 3-5 visuels max" },
      { type: "📝 Post texte + question", perf: "💡 Engagement", conseil: "Question simple = maximum de commentaires" },
      { type: "🔴 Facebook Live", perf: "💡 Boost algo", conseil: "Booste la portée organique sur les Pages" },
      { type: "🎉 Event Facebook", perf: "📊 Niche", conseil: "Utile pour communautés et événements locaux" },
    ],
    twitter: [
      { type: "🎬 Vidéo native 30-90s", perf: "🔥 Portée maximale", conseil: "Caption forte, caption sans son obligatoire" },
      { type: "🧵 Thread 5-10 tweets", perf: "📈 Très bon", conseil: "Tweet 1 = hook, valeur dans les suivants" },
      { type: "📸 Tweet + image", perf: "📈 Bon", conseil: "+35% d'engagement avec une image pertinente" },
      { type: "📊 Sondage", perf: "💡 Engagement", conseil: "2 options tranchées pour maximiser les votes" },
      { type: "📝 Tweet texte seul", perf: "📊 Variable", conseil: "Fonctionne si compte déjà établi et suivi" },
      { type: "🔁 Quote Tweet viral", perf: "💡 Reach", conseil: "Ajouter de la valeur à un tweet viral existant" },
    ],
  };
}

/* ════════════════════════════════════════
   SONS
════════════════════════════════════════ */
async function fetchSons() {
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

  const fallbackSounds = tiktokSounds.length === 0 ? [
    { son: "Son original (créé par toi)", stat: "🔥 Favorisé par l'algo" },
    { son: "Remix d'un son viral récent", stat: "📈 Très bon reach" },
    { son: "Audio populaire suggéré", stat: "Utilise les suggestions TikTok" },
    { son: "Silence / voix seule", stat: "💡 Pour contenu éducatif" },
  ] : tiktokSounds;

  return {
    tiktok: fallbackSounds,
    instagram: [
      { son: "Son original de Reels", stat: "🔥 Favorisé par Instagram" },
      { son: "Audio trending suggéré", stat: "Vérifie la section 'Populaire'" },
      { son: "Migration depuis TikTok", stat: "Sons viraux TikTok → Reels" },
      { son: "Musique libre de droits", stat: "Évite les suppressions de vidéo" },
    ],
    facebook: [
      { son: "Son original / voix", stat: "🔥 Meilleure portée organique" },
      { son: "Musique Meta Sound Collection", stat: "Libre de droits, sans risque" },
      { son: "Son viral TikTok adapté", stat: "Migration courante vers Reels FB" },
    ],
    twitter: [
      { son: "Vidéo silencieuse + sous-titres", stat: "🔥 80% regardent sans son" },
      { son: "Son ambiance / musique douce", stat: "Pour les vidéos courtes < 30s" },
      { son: "Voix seule claire", stat: "💡 Pour contenu explicatif" },
    ],
    conseils: [
      { son: "🎵 Son original = boost algorithme", stat: "TikTok et Reels Instagram" },
      { son: "🎵 Sons < 15s = meilleure rétention", stat: "Coupe toujours sur le beat" },
      { son: "🎵 Silence dramatique avant reveal", stat: "Très efficace sur les annonces" },
      { son: "🎵 Voix naturelle non scriptée", stat: "Plus authentique = plus d'engagement" },
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

  const [hashtags, tendances, sons] = await Promise.all([
    fetchHashtags(),
    fetchTendances(),
    fetchSons(),
  ]);

  const typesContenu = fetchTypesContenu();

  return NextResponse.json(
    { updatedAt: now, hashtags, tendances, typesContenu, sons },
    { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300" } }
  );
}
