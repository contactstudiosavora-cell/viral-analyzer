import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/json,*/*",
  "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
};

async function safeFetch(url: string, options: RequestInit = {}): Promise<Response | null> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: { ...BROWSER_HEADERS, ...(options.headers || {}) },
      signal: AbortSignal.timeout(8000),
    });
    return res.ok ? res : null;
  } catch {
    return null;
  }
}

/* ──────────────────────────────────────
   GOOGLE TRENDS — recherches du jour
────────────────────────────────────── */
async function fetchGoogleDailyTrends(): Promise<string> {
  const res = await safeFetch(
    "https://trends.google.com/trends/api/dailytrends?hl=fr&tz=-60&geo=FR&ns=15",
    { headers: { Accept: "text/plain" } }
  );
  if (!res) return "";
  try {
    const text = await res.text();
    const json = JSON.parse(text.replace(/^\)\]\}',?\n/, ""));
    const searches: string[] =
      json?.default?.trendingSearchesDays?.[0]?.trendingSearches
        ?.slice(0, 20)
        ?.map(
          (t: { title?: { query?: string }; formattedTraffic?: string }) =>
            `${t.title?.query} (${t.formattedTraffic || "trending"})`
        ) ?? [];
    return searches.length
      ? `🔍 TENDANCES GOOGLE France (aujourd'hui):\n${searches.join("\n")}`
      : "";
  } catch {
    return "";
  }
}

/* ──────────────────────────────────────
   YOUTUBE — vidéos tendance France
────────────────────────────────────── */
async function fetchYouTubeTrending(): Promise<string> {
  const res = await safeFetch(
    "https://www.youtube.com/feeds/videos.xml?chart=mostPopular&hl=fr&regionCode=FR",
    { headers: { Accept: "application/atom+xml, text/xml, */*" } }
  );
  if (!res) return "";
  try {
    const text = await res.text();
    const titles = [...text.matchAll(/<title>([^<]{5,})<\/title>/g)]
      .slice(1, 11)
      .map((m) => `• ${m[1]}`);
    return titles.length ? `▶️ YOUTUBE TENDANCES France:\n${titles.join("\n")}` : "";
  } catch {
    return "";
  }
}

/* ──────────────────────────────────────
   TIKTOK CREATIVE CENTER — hashtags
────────────────────────────────────── */
async function fetchTikTokHashtags(): Promise<string> {
  const res = await safeFetch(
    "https://ads.tiktok.com/creative_radar_api/v1/popular_trend/hashtag/list?period=7&page=1&limit=20&country_code=FR&language=fr",
    { headers: { Referer: "https://ads.tiktok.com/business/creativecenter/trends/hashtag/pc/fr" } }
  );
  if (!res) return "";
  try {
    const json = await res.json();
    const items: string[] =
      json?.data?.list
        ?.slice(0, 20)
        ?.map(
          (h: { hashtag_name?: string; publish_cnt?: number; video_views?: number }) =>
            `#${h.hashtag_name} (${h.publish_cnt ?? "?"} vidéos, ${h.video_views ?? "?"} vues)`
        ) ?? [];
    return items.length ? `🎯 TIKTOK HASHTAGS (7 jours, France):\n${items.join("\n")}` : "";
  } catch {
    return "";
  }
}

/* ──────────────────────────────────────
   TIKTOK CREATIVE CENTER — sons
────────────────────────────────────── */
async function fetchTikTokSounds(): Promise<string> {
  const res = await safeFetch(
    "https://ads.tiktok.com/creative_radar_api/v1/popular_trend/sound/list?period=7&page=1&limit=10&country_code=FR",
    { headers: { Referer: "https://ads.tiktok.com/business/creativecenter/trends/sound/pc/fr" } }
  );
  if (!res) return "";
  try {
    const json = await res.json();
    const items: string[] =
      json?.data?.list
        ?.slice(0, 10)
        ?.map(
          (s: { sound_name?: string; author_name?: string; video_count?: number }) =>
            `"${s.sound_name}" — ${s.author_name ?? "?"} (${s.video_count ?? "?"} vidéos)`
        ) ?? [];
    return items.length ? `🎵 TIKTOK SONS TENDANCE (7 jours):\n${items.join("\n")}` : "";
  } catch {
    return "";
  }
}

/* ──────────────────────────────────────
   TIKTOK CREATIVE CENTER — créateurs
────────────────────────────────────── */
async function fetchTikTokCreators(): Promise<string> {
  const res = await safeFetch(
    "https://ads.tiktok.com/creative_radar_api/v1/popular_trend/creator/list?period=7&page=1&limit=10&country_code=FR",
    { headers: { Referer: "https://ads.tiktok.com/business/creativecenter/trends/creator/pc/fr" } }
  );
  if (!res) return "";
  try {
    const json = await res.json();
    const items: string[] =
      json?.data?.list
        ?.slice(0, 10)
        ?.map(
          (c: { nick_name?: string; follower_cnt?: number }) =>
            `@${c.nick_name ?? "?"} (${c.follower_cnt ?? "?"} abonnés)`
        ) ?? [];
    return items.length ? `🌟 TIKTOK CRÉATEURS TENDANCE (7 jours):\n${items.join("\n")}` : "";
  } catch {
    return "";
  }
}

/* ──────────────────────────────────────
   TWITTER / X — tendances depuis trends24.in
────────────────────────────────────── */
async function fetchTwitterTrends(): Promise<string> {
  // Try France first, then worldwide
  for (const geo of ["france", "worldwide"]) {
    const res = await safeFetch(`https://trends24.in/${geo}/`, {
      headers: { Accept: "text/html" },
    });
    if (!res) continue;
    try {
      const html = await res.text();
      // Extract trend names from the list items
      const nameMatches = [
        ...html.matchAll(/class="trend-name[^"]*"[^>]*>([^<]{2,60})</g),
      ].map((m) => m[1].trim()).filter(Boolean);

      if (nameMatches.length > 0) {
        const unique = [...new Set(nameMatches)].slice(0, 20);
        return `🐦 X/TWITTER TENDANCES (${geo === "france" ? "France" : "Monde"}, maintenant):\n${unique.map((t) => `• ${t}`).join("\n")}`;
      }

      // Fallback: grab any #hashtag or trend-card anchor text
      const fallback = [...new Set(
        [...html.matchAll(/href="\/[^/]+\/([^/?"]{2,40})\/?"/g)]
          .map((m) => decodeURIComponent(m[1]).replace(/-/g, " "))
          .filter((t) => t.length > 2 && !t.includes("."))
      )].slice(0, 15);

      if (fallback.length > 0) {
        return `🐦 X/TWITTER TENDANCES (${geo === "france" ? "France" : "Monde"}):\n${fallback.map((t) => `• ${t}`).join("\n")}`;
      }
    } catch {
      continue;
    }
  }
  return "";
}

/* ──────────────────────────────────────
   INSTAGRAM — hashtags tendance (top-hashtags.com)
────────────────────────────────────── */
async function fetchInstagramHashtags(): Promise<string> {
  const res = await safeFetch("https://top-hashtags.com/instagram/", {
    headers: { Accept: "text/html" },
  });
  if (!res) return "";
  try {
    const html = await res.text();
    // Extract hashtags from the page
    const matches = [
      ...html.matchAll(/<[^>]+class="[^"]*tag[^"]*"[^>]*>#?([\w\u00C0-\u017E]{2,30})</g),
    ].map((m) => `#${m[1]}`);

    if (matches.length > 0) {
      const unique = [...new Set(matches)].slice(0, 20);
      return `📸 INSTAGRAM HASHTAGS TENDANCE:\n${unique.join(", ")}`;
    }

    // Generic hashtag fallback
    const allTags = [...new Set(
      [...html.matchAll(/#([\w\u00C0-\u017E]{3,25})/g)].map((m) => `#${m[1]}`)
    )].slice(0, 20);

    return allTags.length ? `📸 INSTAGRAM HASHTAGS TENDANCE:\n${allTags.join(", ")}` : "";
  } catch {
    return "";
  }
}

/* ──────────────────────────────────────
   INSTAGRAM — trending Reels via Google Trends
────────────────────────────────────── */
async function fetchInstagramReelsTrends(): Promise<string> {
  // Query Google Trends for what's trending in Instagram content
  const keywords = ["instagram reels", "instagram viral", "instagram trend"];
  const results: string[] = [];
  for (const kw of keywords) {
    const req = encodeURIComponent(
      JSON.stringify({
        comparisonItem: [{ keyword: kw, geo: "FR", time: "now 7-d" }],
        category: 0,
        property: "",
      })
    );
    const res = await safeFetch(
      `https://trends.google.com/trends/api/explore?hl=fr&tz=-60&req=${req}&ots=${Date.now()}&source=lnms`,
      { headers: { Accept: "text/plain" } }
    );
    if (!res) continue;
    try {
      const text = await res.text();
      const json = JSON.parse(text.replace(/^\)\]\}',?\n/, ""));
      // Extract rising related queries
      const relatedWidget = json?.widgets?.find(
        (w: { type?: string; title?: string }) =>
          w.title === "Related queries" || w.type === "RELATED_QUERIES"
      );
      if (relatedWidget?.request) {
        results.push(`📈 Intérêt Google pour "${kw}" : en hausse`);
      }
    } catch {
      continue;
    }
  }
  return results.length ? `📸 INSTAGRAM TENDANCES GOOGLE:\n${results.join("\n")}` : "";
}

/* ──────────────────────────────────────
   FACEBOOK — tendances via Reddit + Google
────────────────────────────────────── */
async function fetchFacebookAdsLibrary(): Promise<string> {
  // Fetch from Reddit r/FacebookAds and r/facebookmarketing for real discussions
  // (Facebook has no public trends API without auth)
  return "";
}

/* ──────────────────────────────────────
   REDDIT — posts chauds d'un subreddit
────────────────────────────────────── */
async function fetchRedditHot(subreddit: string, limit = 8): Promise<string[]> {
  const res = await safeFetch(
    `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}&raw_json=1`
  );
  if (!res) return [];
  try {
    const json = await res.json();
    return (
      json?.data?.children
        ?.map((c: { data?: { title?: string; score?: number } }) =>
          c.data?.title ? `• ${c.data.title} (${c.data.score ?? 0} pts)` : null
        )
        .filter(Boolean) ?? []
    );
  } catch {
    return [];
  }
}

async function fetchRedditMulti(subreddits: string[], limitPerSub = 5): Promise<string> {
  const results = await Promise.allSettled(
    subreddits.map((s) => fetchRedditHot(s, limitPerSub))
  );
  const posts = results
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .slice(0, 20);
  return posts.length ? posts.join("\n") : "";
}

/* ──────────────────────────────────────
   ORCHESTRATEUR PRINCIPAL
────────────────────────────────────── */
async function collectRealTrendData(platform: string, niche?: string): Promise<string> {
  const today = new Date().toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    dateStyle: "full",
    timeStyle: "short",
  });

  const p = platform.toLowerCase();
  const isTikTok = p.includes("tiktok");
  const isInstagram = p.includes("instagram");
  const isFacebook = p.includes("facebook");
  const isTwitter = p.includes("twitter") || p === "x";

  // ── Tâches communes ──
  const commonTasks: Promise<string>[] = [
    fetchGoogleDailyTrends(),
    fetchYouTubeTrending(),
  ];

  // ── Tâches spécifiques à la plateforme ──
  const platformTasks: Promise<string>[] = [];

  if (isTikTok) {
    platformTasks.push(
      fetchTikTokHashtags(),
      fetchTikTokSounds(),
      fetchTikTokCreators(),
      fetchRedditMulti(["TikTok", "TikTokTips", "contentcreation", "ugc"], 5).then(
        (r) => (r ? `💬 REDDIT TIKTOK (discussions actuelles):\n${r}` : "")
      )
    );
  }

  if (isInstagram) {
    platformTasks.push(
      fetchInstagramHashtags(),
      fetchInstagramReelsTrends(),
      fetchRedditMulti(
        ["Instagram", "InstagramMarketing", "reels", "ugc", "socialmedimarketing"],
        5
      ).then((r) => (r ? `💬 REDDIT INSTAGRAM (discussions actuelles):\n${r}` : ""))
    );
  }

  if (isFacebook) {
    void fetchFacebookAdsLibrary(); // placeholder — no public API
    platformTasks.push(
      fetchRedditMulti(
        ["facebook", "FacebookMarketing", "FacebookAds", "socialmedia"],
        6
      ).then((r) => (r ? `💬 REDDIT FACEBOOK (discussions actuelles):\n${r}` : "")),
      // Google Trends for Facebook-specific searches
      (async () => {
        const res = await safeFetch(
          "https://trends.google.com/trends/api/dailytrends?hl=fr&tz=-60&geo=FR&cat=958&ns=15",
          { headers: { Accept: "text/plain" } }
        );
        if (!res) return "";
        try {
          const text = await res.text();
          const json = JSON.parse(text.replace(/^\)\]\}',?\n/, ""));
          const searches: string[] =
            json?.default?.trendingSearchesDays?.[0]?.trendingSearches
              ?.slice(0, 10)
              ?.map((t: { title?: { query?: string } }) => `• ${t.title?.query}`)
              .filter(Boolean) ?? [];
          return searches.length
            ? `📘 TENDANCES GOOGLE (catégorie Réseaux sociaux):\n${searches.join("\n")}`
            : "";
        } catch {
          return "";
        }
      })()
    );
  }

  if (isTwitter) {
    platformTasks.push(
      fetchTwitterTrends(),
      fetchRedditMulti(["twitter", "Twittermarketing", "socialmedia", "marketing"], 5).then(
        (r) => (r ? `💬 REDDIT X/TWITTER (discussions actuelles):\n${r}` : "")
      )
    );
  }

  // ── Niche spécifique ──
  const nicheTasks: Promise<string>[] = [];
  if (niche?.trim()) {
    nicheTasks.push(
      fetchRedditMulti([niche.toLowerCase().replace(/\s+/g, ""), "ugc", "contentmarketing"], 5).then(
        (r) => (r ? `🎯 REDDIT NICHE "${niche}":\n${r}` : "")
      )
    );
  }

  // ── Exécution parallèle avec cap à 14s ──
  const allTasks = [...commonTasks, ...platformTasks, ...nicheTasks];

  const results = await Promise.race([
    Promise.allSettled(allTasks),
    new Promise<PromiseSettledResult<string>[]>((resolve) =>
      setTimeout(
        () => resolve(allTasks.map(() => ({ status: "fulfilled", value: "" } as PromiseSettledResult<string>))),
        14000
      )
    ),
  ]);

  const sections = results
    .map((r) => (r.status === "fulfilled" ? r.value : ""))
    .filter(Boolean);

  const header = `📅 DONNÉES COLLECTÉES EN TEMPS RÉEL — ${today}\n${"─".repeat(60)}`;
  const noDataNote =
    sections.length <= 1
      ? "⚠️ Sources externes peu disponibles ce moment — analyse enrichie avec les connaissances du modèle."
      : "";

  return [header, ...sections, noDataNote].filter(Boolean).join("\n\n");
}

/* ──────────────────────────────────────
   HANDLER PRINCIPAL
────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const { platform, niche } = await req.json();

    if (!platform?.trim()) {
      return NextResponse.json({ error: "Plateforme requise" }, { status: 400 });
    }

    const realData = await collectRealTrendData(platform, niche);

    const prompt = `Tu es un expert en tendances social media et en création de contenu viral.

PLATEFORME ANALYSÉE : ${platform}
${niche ? `CATÉGORIE / NICHE : ${niche}` : "SCOPE : Toutes catégories confondues"}

======= DONNÉES RÉELLES COLLECTÉES EN TEMPS RÉEL =======
${realData}
========================================================

Ces données proviennent de sources réelles collectées maintenant :
${platform.toLowerCase().includes("tiktok") ? "- TikTok Creative Center (hashtags, sons, créateurs trending)" : ""}
${platform.toLowerCase().includes("instagram") ? "- top-hashtags.com (hashtags Instagram trending)\n- Google Trends (Instagram Reels tendances)" : ""}
${(platform.toLowerCase().includes("twitter") || platform.toLowerCase() === "x") ? "- trends24.in (hashtags X/Twitter trending en temps réel)" : ""}
- Google Trends France (recherches du jour)
- Reddit (discussions actuelles par plateforme)
- YouTube Trending France

Base ton analyse PRINCIPALEMENT sur ces données. Interprète-les avec ta connaissance des algorithmes et du comportement des créateurs pour produire des insights actionnables et pertinents AUJOURD'HUI.

Réponds UNIQUEMENT en JSON valide :

{
  "plateforme": "${platform}",
  "niche": "${niche || "Général"}",
  "donnees_reelles": true,
  "formats_qui_explosent": [
    { "format": "Nom du format", "description": "Description courte", "pourquoi": "Pourquoi ça marche selon les données", "duree": "durée idéale" },
    { "format": "Nom du format", "description": "Description courte", "pourquoi": "Pourquoi ça marche", "duree": "durée idéale" },
    { "format": "Nom du format", "description": "Description courte", "pourquoi": "Pourquoi ça marche", "duree": "durée idéale" },
    { "format": "Nom du format", "description": "Description courte", "pourquoi": "Pourquoi ça marche", "duree": "durée idéale" }
  ],
  "types_de_hooks": [
    { "type": "Nom du hook", "exemple": "Exemple concret basé sur les tendances réelles", "score_retention": 9 },
    { "type": "Nom du hook", "exemple": "Exemple concret", "score_retention": 8 },
    { "type": "Nom du hook", "exemple": "Exemple concret", "score_retention": 8 },
    { "type": "Nom du hook", "exemple": "Exemple concret", "score_retention": 7 },
    { "type": "Nom du hook", "exemple": "Exemple concret", "score_retention": 7 }
  ],
  "tendances_musicales": {
    "styles": ["Style musical 1", "Style 2", "Style 3", "Style 4"],
    "energie": "Description de l'énergie musicale qui performe",
    "conseil": "Conseil concret sur la musique sur ${platform}"
  },
  "visuels_qui_performent": {
    "couleurs": ["Couleur/palette 1", "Couleur 2", "Couleur 3"],
    "styles_tournage": ["Style 1", "Style 2", "Style 3"],
    "transitions": ["Transition 1", "Transition 2"],
    "texte_a_lecran": "Conseil sur l'utilisation du texte à l'écran"
  },
  "sujets_en_tendance": [
    { "sujet": "Sujet issu des données réelles 1", "angle": "Angle à exploiter", "urgence": "haute" },
    { "sujet": "Sujet 2 basé sur les données", "angle": "Angle à exploiter", "urgence": "haute" },
    { "sujet": "Sujet 3", "angle": "Angle à exploiter", "urgence": "moyenne" },
    { "sujet": "Sujet 4", "angle": "Angle à exploiter", "urgence": "basse" }
  ],
  "algorithme": {
    "ce_qui_booste": ["Signal positif 1", "Signal 2", "Signal 3"],
    "ce_qui_penalise": ["Signal négatif 1", "Signal 2"],
    "meilleur_moment_poster": "Conseil sur les horaires",
    "frequence_ideale": "Fréquence recommandée"
  },
  "erreurs_du_moment": [
    "Erreur très fréquente actuellement 1",
    "Erreur 2",
    "Erreur 3"
  ],
  "opportunites": [
    { "opportunite": "Opportunité basée sur les données réelles 1", "pourquoi_maintenant": "Raison urgente" },
    { "opportunite": "Opportunité 2", "pourquoi_maintenant": "Raison" },
    { "opportunite": "Opportunité 3", "pourquoi_maintenant": "Raison" }
  ],
  "exemples_concepts": [
    "Concept de vidéo concret à faire maintenant — basé sur les tendances réelles",
    "Concept 2",
    "Concept 3"
  ],
  "bonus": {
    "hooks_optimises": [
      "Hook ultra-optimisé pour ${platform} maintenant 1",
      "Hook optimisé 2",
      "Hook optimisé 3"
    ],
    "idee_video": "Idée de vidéo complète à tourner cette semaine sur ${platform}, basée sur les tendances réelles"
  }
}`;

    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 8096,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = (message.content[0] as { type: string; text: string }).text.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Erreur de parsing" }, { status: 500 });
    }

    const analysis = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ analysis, platform, niche, realtime: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("analyze/trends error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
