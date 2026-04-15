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

/* ── TikTok hashtags ── */
async function tiktokHashtags(): Promise<{ tag: string; views: string }[]> {
  const res = await safeFetch(
    "https://ads.tiktok.com/creative_radar_api/v1/popular_trend/hashtag/list?period=7&page=1&limit=10&country_code=FR&language=fr",
    { headers: { Referer: "https://ads.tiktok.com/business/creativecenter/trends/hashtag/pc/fr" } }
  );
  if (!res) return [];
  try {
    const json = await res.json();
    return (
      json?.data?.list?.slice(0, 8)?.map((h: { hashtag_name?: string; video_views?: number }) => ({
        tag: `#${h.hashtag_name}`,
        views: h.video_views ? formatNumber(h.video_views) + " vues" : "trending",
      })) ?? []
    );
  } catch { return []; }
}

/* ── TikTok sons ── */
async function tiktokSounds(): Promise<{ name: string; count: string }[]> {
  const res = await safeFetch(
    "https://ads.tiktok.com/creative_radar_api/v1/popular_trend/sound/list?period=7&page=1&limit=5&country_code=FR",
    { headers: { Referer: "https://ads.tiktok.com/business/creativecenter/trends/sound/pc/fr" } }
  );
  if (!res) return [];
  try {
    const json = await res.json();
    return (
      json?.data?.list?.slice(0, 5)?.map((s: { sound_name?: string; author_name?: string; video_count?: number }) => ({
        name: `${s.sound_name} — ${s.author_name ?? "?"}`,
        count: s.video_count ? formatNumber(s.video_count) + " vidéos" : "trending",
      })) ?? []
    );
  } catch { return []; }
}

/* ── Twitter/X trends via trends24.in ── */
async function twitterTrends(): Promise<{ tag: string; volume: string }[]> {
  const res = await safeFetch("https://trends24.in/france/", { headers: { Accept: "text/html" } });
  if (!res) return [];
  try {
    const html = await res.text();
    // Extract trend items from the trending list
    const matches = [
      ...html.matchAll(/class="trend-name[^"]*"[^>]*>([^<]{2,50})</g),
    ].map((m) => m[1].trim()).filter(Boolean);

    if (matches.length > 0) {
      return [...new Set(matches)].slice(0, 8).map((t) => ({ tag: t, volume: "tendance" }));
    }

    // Fallback: extract hashtags
    const tags = [...new Set(
      [...html.matchAll(/(#[\w\u00C0-\u017E]{2,30})/g)].map((m) => m[1])
    )].slice(0, 8);
    return tags.map((t) => ({ tag: t, volume: "trending" }));
  } catch { return []; }
}

/* ── Instagram hashtags via top-hashtags.com ── */
async function instagramHashtags(): Promise<{ tag: string; level: string }[]> {
  const res = await safeFetch("https://top-hashtags.com/instagram/", { headers: { Accept: "text/html" } });
  if (!res) return [];
  try {
    const html = await res.text();
    const tags = [...new Set(
      [...html.matchAll(/#([\w\u00C0-\u017E]{3,25})/g)].map((m) => `#${m[1]}`)
    )].slice(0, 8);
    return tags.map((t) => ({ tag: t, level: "populaire" }));
  } catch { return []; }
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
        .filter((t: { query: string }) => t.query) ?? []
    );
  } catch { return []; }
}

/* ── Reddit hot (content creation) ── */
async function redditTrends(): Promise<{ title: string; sub: string }[]> {
  const subs = ["TikTok", "InstagramMarketing", "socialmediamarketing", "contentcreation"];
  const results: { title: string; sub: string }[] = [];
  await Promise.allSettled(
    subs.map(async (sub) => {
      const res = await safeFetch(`https://www.reddit.com/r/${sub}/hot.json?limit=3&raw_json=1`);
      if (!res) return;
      try {
        const json = await res.json();
        json?.data?.children?.slice(0, 3)?.forEach((c: { data?: { title?: string } }) => {
          if (c.data?.title) results.push({ title: c.data.title, sub: `r/${sub}` });
        });
      } catch { /* skip */ }
    })
  );
  return results.slice(0, 6);
}

/* ── Format big numbers ── */
function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return String(n);
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

  // Fetch all in parallel
  const [tiktokTags, tiktokSnds, twitter, instagram, google, reddit] = await Promise.all([
    tiktokHashtags(),
    tiktokSounds(),
    twitterTrends(),
    instagramHashtags(),
    googleTrends(),
    redditTrends(),
  ]);

  return NextResponse.json(
    {
      updatedAt: now,
      platforms: {
        tiktok: { hashtags: tiktokTags, sounds: tiktokSnds },
        twitter: { trends: twitter },
        instagram: { hashtags: instagram },
        google: { trends: google },
        reddit: { posts: reddit },
      },
    },
    {
      headers: {
        // Cache 10 min on CDN, allow stale for 5 min
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300",
      },
    }
  );
}
