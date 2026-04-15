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

function isRealTag(tag: string): boolean {
  const clean = tag.replace(/^#/, "");
  if (/^[0-9a-fA-F]{3,8}$/.test(clean)) return false;
  if (/^\d+$/.test(clean)) return false;
  if (clean.length < 2) return false;
  return true;
}

/* ────────────────────────────────────────
   TIKTOK — via Reddit r/TikTok + tiktokviral
   (Creative Center blocks Vercel IPs)
──────────────────────────────────────── */
async function tiktokTrends(): Promise<{ tag: string; views: string }[]> {
  // Method 1: scrape Reddit r/TikTok for trending topics
  const res = await safeFetch(
    "https://www.reddit.com/r/TikTok/hot.json?limit=15&raw_json=1"
  );
  if (res) {
    try {
      const json = await res.json();
      const posts = json?.data?.children ?? [];
      const tags: { tag: string; views: string }[] = [];

      for (const post of posts) {
        const title: string = post.data?.title ?? "";
        // Extract hashtags from titles
        const found = [...title.matchAll(/#([\w\u00C0-\u017E]{2,25})/g)].map(m => `#${m[1]}`);
        found.forEach(t => { if (isRealTag(t)) tags.push({ tag: t, views: "viral" }); });
        // Also use post title as a trend if it's short enough
        if (title.length < 50 && title.length > 5) {
          tags.push({ tag: title.slice(0, 40), views: `${post.data?.score ?? 0} pts` });
        }
      }

      const unique = [...new Map(tags.map(t => [t.tag, t])).values()].slice(0, 8);
      if (unique.length > 0) return unique;
    } catch { /* continue */ }
  }

  // Method 2: TikWM trending (public API)
  const res2 = await safeFetch("https://www.tikwm.com/api/feed/list?count=10&cursor=0");
  if (res2) {
    try {
      const json = await res2.json();
      const items = json?.data?.videos ?? [];
      const tags: { tag: string; views: string }[] = [];
      for (const v of items.slice(0, 10)) {
        const desc: string = v.title ?? v.desc ?? "";
        const found = [...desc.matchAll(/#([\w\u00C0-\u017E]{2,25})/g)].map(m => `#${m[1]}`);
        found.forEach(t => { if (isRealTag(t)) tags.push({ tag: t, views: v.play_count ? formatNumber(v.play_count) + " vues" : "viral" }); });
      }
      const unique = [...new Map(tags.map(t => [t.tag, t])).values()].slice(0, 8);
      if (unique.length > 0) return unique;
    } catch { /* continue */ }
  }

  // Fallback: curated always-trending TikTok tags
  return [
    { tag: "#pourtoi", views: "🔥 permanent" },
    { tag: "#viral", views: "🔥 permanent" },
    { tag: "#fyp", views: "🔥 permanent" },
    { tag: "#foryoupage", views: "populaire" },
    { tag: "#trending", views: "populaire" },
    { tag: "#tiktok", views: "populaire" },
  ];
}

/* ────────────────────────────────────────
   GOOGLE TRENDS — via RSS (plus fiable que l'API JSON)
──────────────────────────────────────── */
async function googleTrends(): Promise<{ query: string; traffic: string }[]> {
  // Method 1: RSS feed (most reliable, no auth needed)
  const res = await safeFetch(
    "https://trends.google.com/trending/rss?geo=FR",
    { headers: { Accept: "application/rss+xml, text/xml, */*" } }
  );
  if (res) {
    try {
      const xml = await res.text();
      const titles = [...xml.matchAll(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>/g)]
        .map(m => m[1].trim())
        .filter(t => t.length > 2 && t !== "Google Trends");

      const traffic = [...xml.matchAll(/<ht:approx_traffic>([^<]+)<\/ht:approx_traffic>/g)]
        .map(m => m[1].trim());

      if (titles.length > 0) {
        return titles.slice(0, 8).map((q, i) => ({
          query: q,
          traffic: traffic[i] ?? "trending",
        }));
      }
    } catch { /* continue */ }
  }

  // Method 2: Daily trends JSON API
  const res2 = await safeFetch(
    "https://trends.google.com/trends/api/dailytrends?hl=fr&tz=-60&geo=FR&ns=15",
    { headers: { Accept: "text/plain" } }
  );
  if (res2) {
    try {
      const text = await res2.text();
      const json = JSON.parse(text.replace(/^\)\]\}',?\n/, ""));
      const results = json?.default?.trendingSearchesDays?.[0]?.trendingSearches
        ?.slice(0, 8)
        ?.map((t: { title?: { query?: string }; formattedTraffic?: string }) => ({
          query: t.title?.query ?? "",
          traffic: t.formattedTraffic ?? "trending",
        }))
        .filter((t: { query: string }) => t.query.length > 0) ?? [];
      if (results.length > 0) return results;
    } catch { /* continue */ }
  }

  // Method 3: Google Trends via pytrends-style public endpoint
  const res3 = await safeFetch(
    "https://trends.google.com/trends/hottrends/visualize/internal/data"
  );
  if (res3) {
    try {
      const json = await res3.json();
      const fr = json?.["FR"] ?? json?.["fr"] ?? [];
      if (Array.isArray(fr) && fr.length > 0) {
        return fr.slice(0, 8).map((q: string) => ({ query: q, traffic: "trending" }));
      }
    } catch { /* continue */ }
  }

  return [];
}

/* ────────────────────────────────────────
   TWITTER/X — trends24.in
──────────────────────────────────────── */
async function twitterTrends(): Promise<{ tag: string; volume: string }[]> {
  for (const geo of ["france", "worldwide"]) {
    const res = await safeFetch(`https://trends24.in/${geo}/`, {
      headers: { Accept: "text/html" },
    });
    if (!res) continue;
    try {
      const html = await res.text();

      // Extract from trend-name spans
      const byClass = [...html.matchAll(/class="trend-name[^"]*"[^>]*>([^<]{2,60})</g)]
        .map(m => m[1].trim()).filter(t => t && isRealTag(t.startsWith("#") ? t : `#${t}`));
      if (byClass.length > 0) {
        return [...new Set(byClass)].slice(0, 8).map(t => ({ tag: t, volume: "tendance" }));
      }

      // Extract anchor text that looks like hashtags or short phrases
      const anchors = [...html.matchAll(/<a[^>]+class="[^"]*trend[^"]*"[^>]*>([^<]{2,40})<\/a>/g)]
        .map(m => m[1].trim()).filter(Boolean);
      if (anchors.length > 0) {
        return [...new Set(anchors)]
          .filter(t => isRealTag(t.startsWith("#") ? t : `#${t}`))
          .slice(0, 8)
          .map(t => ({ tag: t, volume: "trending" }));
      }
    } catch { continue; }
  }
  return [];
}

/* ────────────────────────────────────────
   INSTAGRAM — hashtags from Reddit
──────────────────────────────────────── */
async function instagramHashtags(): Promise<{ tag: string; level: string }[]> {
  // Use Reddit r/Instagram for real trending topics
  const res = await safeFetch(
    "https://www.reddit.com/r/Instagram+InstagramMarketing/hot.json?limit=15&raw_json=1"
  );
  if (res) {
    try {
      const json = await res.json();
      const posts = json?.data?.children ?? [];
      const tags: string[] = [];
      for (const post of posts) {
        const title: string = post.data?.title ?? "";
        const found = [...title.matchAll(/#([\w\u00C0-\u017E]{2,25})/g)].map(m => `#${m[1]}`);
        found.filter(isRealTag).forEach(t => tags.push(t));
      }
      const unique = [...new Set(tags)].slice(0, 8);
      if (unique.length >= 3) return unique.map(t => ({ tag: t, level: "populaire" }));
    } catch { /* continue */ }
  }

  // Reliable curated fallback
  return [
    { tag: "#reels", level: "🔥 viral" },
    { tag: "#explore", level: "🔥 viral" },
    { tag: "#viral", level: "🔥 viral" },
    { tag: "#trending", level: "populaire" },
    { tag: "#contentcreator", level: "populaire" },
    { tag: "#ugc", level: "populaire" },
    { tag: "#instagood", level: "populaire" },
    { tag: "#fyp", level: "populaire" },
  ];
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

  const [tiktok, twitter, instagram, google] = await Promise.all([
    tiktokTrends(),
    twitterTrends(),
    instagramHashtags(),
    googleTrends(),
  ]);

  return NextResponse.json(
    {
      updatedAt: now,
      platforms: {
        tiktok: { hashtags: tiktok, sounds: [] },
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
