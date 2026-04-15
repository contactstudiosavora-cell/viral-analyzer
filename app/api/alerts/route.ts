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
      signal: AbortSignal.timeout(7000),
    });
    return res.ok ? res : null;
  } catch {
    return null;
  }
}

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return String(n);
}

// Filter out CSS hex colors and garbage strings
function isRealHashtag(tag: string): boolean {
  const clean = tag.replace(/^#/, "");
  // Reject pure hex colors (3, 4, 6, or 8 char hex)
  if (/^[0-9a-fA-F]{3}$/.test(clean)) return false;
  if (/^[0-9a-fA-F]{4}$/.test(clean)) return false;
  if (/^[0-9a-fA-F]{6}$/.test(clean)) return false;
  if (/^[0-9a-fA-F]{8}$/.test(clean)) return false;
  // Reject pure numbers
  if (/^\d+$/.test(clean)) return false;
  // Must have at least 2 real characters
  if (clean.length < 2) return false;
  return true;
}

/* ── TikTok Creative Center hashtags ── */
async function tiktokHashtags(): Promise<{ tag: string; views: string }[]> {
  // Try FR first, then US
  for (const country of ["FR", "US"]) {
    const res = await safeFetch(
      `https://ads.tiktok.com/creative_radar_api/v1/popular_trend/hashtag/list?period=7&page=1&limit=15&country_code=${country}&language=${country === "FR" ? "fr" : "en"}`,
      { headers: { Referer: "https://ads.tiktok.com/business/creativecenter/trends/hashtag/pc/en" } }
    );
    if (!res) continue;
    try {
      const json = await res.json();
      const items = json?.data?.list?.slice(0, 8)?.map(
        (h: { hashtag_name?: string; video_views?: number }) => ({
          tag: `#${h.hashtag_name}`,
          views: h.video_views ? formatNumber(h.video_views) + " vues" : "trending",
        })
      ) ?? [];
      if (items.length > 0) return items;
    } catch { continue; }
  }
  return [];
}

/* ── TikTok Creative Center sounds ── */
async function tiktokSounds(): Promise<{ name: string; count: string }[]> {
  const res = await safeFetch(
    "https://ads.tiktok.com/creative_radar_api/v1/popular_trend/sound/list?period=7&page=1&limit=5&country_code=US",
    { headers: { Referer: "https://ads.tiktok.com/business/creativecenter/trends/sound/pc/en" } }
  );
  if (!res) return [];
  try {
    const json = await res.json();
    return json?.data?.list?.slice(0, 4)?.map(
      (s: { sound_name?: string; author_name?: string; video_count?: number }) => ({
        name: `🎵 ${s.sound_name ?? "?"} — ${s.author_name ?? "?"}`,
        count: s.video_count ? formatNumber(s.video_count) + " vidéos" : "trending",
      })
    ) ?? [];
  } catch { return []; }
}

/* ── Twitter/X trends via trends24.in ── */
async function twitterTrends(): Promise<{ tag: string; volume: string }[]> {
  const res = await safeFetch("https://trends24.in/france/", { headers: { Accept: "text/html" } });
  if (!res) return [];
  try {
    const html = await res.text();

    // Strategy 1: grab trend-name class
    const byClass = [
      ...html.matchAll(/class="trend-name[^"]*"[^>]*>([^<]{2,60})</g),
    ].map((m) => m[1].trim()).filter(Boolean);
    if (byClass.length > 0) {
      return [...new Set(byClass)]
        .filter(isRealHashtag)
        .slice(0, 8)
        .map((t) => ({ tag: t, volume: "trending" }));
    }

    // Strategy 2: grab from list items in trend cards — only real words/hashtags
    const listItems = [
      ...html.matchAll(/<a[^>]+href="[^"]*"[^>]*>\s*(#?[\w\u00C0-\u017E][^\n<]{1,40}?)\s*<\/a>/g),
    ]
      .map((m) => m[1].trim())
      .filter((t) => t.length > 2 && !t.includes("trends24") && isRealHashtag(t.startsWith("#") ? t : `#${t}`));

    return [...new Set(listItems)].slice(0, 8).map((t) => ({ tag: t, volume: "trending" }));
  } catch { return []; }
}

/* ── Instagram hashtags via display.net ── */
async function instagramHashtags(): Promise<{ tag: string; level: string }[]> {
  // Use a more reliable source: best-hashtags.com
  const res = await safeFetch("https://best-hashtags.com/hashtag/instagram/", {
    headers: { Accept: "text/html" },
  });
  if (!res) {
    // Fallback: return curated popular Instagram hashtags
    return [
      { tag: "#reels", level: "🔥 très populaire" },
      { tag: "#viral", level: "🔥 très populaire" },
      { tag: "#trending", level: "populaire" },
      { tag: "#explore", level: "populaire" },
      { tag: "#instagood", level: "populaire" },
      { tag: "#content", level: "populaire" },
    ];
  }
  try {
    const html = await res.text();
    const tags = [
      ...new Set(
        [...html.matchAll(/#([\w\u00C0-\u017E]{3,25})/g)]
          .map((m) => `#${m[1]}`)
          .filter(isRealHashtag)
      ),
    ].slice(0, 8);
    if (tags.length > 0) return tags.map((t) => ({ tag: t, level: "populaire" }));

    // Static fallback
    return [
      { tag: "#reels", level: "🔥 très populaire" },
      { tag: "#viral", level: "🔥 très populaire" },
      { tag: "#trending", level: "populaire" },
      { tag: "#explore", level: "populaire" },
      { tag: "#instagood", level: "populaire" },
    ];
  } catch {
    return [
      { tag: "#reels", level: "🔥 très populaire" },
      { tag: "#viral", level: "🔥 très populaire" },
      { tag: "#trending", level: "populaire" },
    ];
  }
}

/* ── Google Trends France ── */
async function googleTrends(): Promise<{ query: string; traffic: string }[]> {
  const res = await safeFetch(
    "https://trends.google.com/trends/api/dailytrends?hl=fr&tz=-60&geo=FR&ns=15",
    { headers: { Accept: "text/plain" } }
  );
  if (!res) return [];
  try {
    const text = await res.text();
    const json = JSON.parse(text.replace(/^\)\]\}',?\n/, ""));
    return (
      json?.default?.trendingSearchesDays?.[0]?.trendingSearches
        ?.slice(0, 8)
        ?.map((t: { title?: { query?: string }; formattedTraffic?: string }) => ({
          query: t.title?.query ?? "",
          traffic: t.formattedTraffic ?? "trending",
        }))
        .filter((t: { query: string }) => t.query.length > 0) ?? []
    );
  } catch { return []; }
}

/* ── Main handler ── */
export async function GET() {
  const now = new Date().toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });

  const [tiktokTags, tiktokSnds, twitter, instagram, google] = await Promise.all([
    tiktokHashtags(),
    tiktokSounds(),
    twitterTrends(),
    instagramHashtags(),
    googleTrends(),
  ]);

  return NextResponse.json(
    {
      updatedAt: now,
      platforms: {
        tiktok: { hashtags: tiktokTags, sounds: tiktokSnds },
        twitter: { trends: twitter },
        instagram: { hashtags: instagram },
        google: { trends: google },
      },
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300",
      },
    }
  );
}
