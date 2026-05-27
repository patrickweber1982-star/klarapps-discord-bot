import type { DashboardStatsChannelType } from "../dashboardSync/dashboardSyncClient.js";

type SocialStatsResult =
  | {
      ok: true;
      value: number;
      status: "ok" | "cached";
    }
  | {
      ok: false;
      reason: string;
    };

type CacheEntry = {
  value: number;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();
const cacheTtlMs = 15 * 60 * 1000;

function cacheKey(type: DashboardStatsChannelType, sourceIdentifier: string) {
  return `${type}:${sourceIdentifier.trim().toLowerCase()}`;
}

function readCached(type: DashboardStatsChannelType, sourceIdentifier: string) {
  const entry = cache.get(cacheKey(type, sourceIdentifier));

  if (!entry || entry.expiresAt <= Date.now()) {
    return null;
  }

  return entry.value;
}

function writeCached(
  type: DashboardStatsChannelType,
  sourceIdentifier: string,
  value: number,
) {
  cache.set(cacheKey(type, sourceIdentifier), {
    value,
    expiresAt: Date.now() + cacheTtlMs,
  });
}

function normalizeYoutubeSource(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return "";

  if (trimmed.startsWith("UC")) {
    return trimmed;
  }

  const handleMatch = trimmed.match(/(?:youtube\.com\/)?@([^/?#\s]+)/i);

  if (handleMatch?.[1]) {
    return `@${handleMatch[1]}`;
  }

  const channelMatch = trimmed.match(/youtube\.com\/channel\/([^/?#\s]+)/i);

  if (channelMatch?.[1]) {
    return channelMatch[1];
  }

  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

async function readYoutubeStat(
  type: "YOUTUBE_SUBSCRIBERS" | "YOUTUBE_VIEWS",
  sourceIdentifier: string,
): Promise<SocialStatsResult> {
  const apiKey = process.env.YOUTUBE_DATA_API_KEY?.trim();
  const source = normalizeYoutubeSource(sourceIdentifier);

  if (!source) {
    return { ok: false, reason: "youtube_source_missing" };
  }

  const cached = readCached(type, source);

  if (cached !== null) {
    return { ok: true, value: cached, status: "cached" };
  }

  if (!apiKey) {
    return { ok: false, reason: "youtube_api_key_missing" };
  }

  const params = new URLSearchParams({
    part: "statistics",
    key: apiKey,
  });

  if (source.startsWith("@")) {
    params.set("forHandle", source);
  } else {
    params.set("id", source);
  }

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?${params.toString()}`,
  );

  if (!response.ok) {
    return { ok: false, reason: `youtube_http_${response.status}` };
  }

  const data = (await response.json().catch(() => null)) as
    | {
        items?: Array<{
          statistics?: {
            subscriberCount?: string;
            viewCount?: string;
          };
        }>;
      }
    | null;
  const stats = data?.items?.[0]?.statistics;

  if (!stats) {
    return { ok: false, reason: "youtube_channel_not_found" };
  }

  const value = Number(
    type === "YOUTUBE_SUBSCRIBERS"
      ? stats.subscriberCount
      : stats.viewCount,
  );

  if (!Number.isFinite(value)) {
    return { ok: false, reason: "youtube_stat_unavailable" };
  }

  writeCached(type, source, value);

  return { ok: true, value, status: "ok" };
}

export function isSocialStatsType(type: DashboardStatsChannelType) {
  return (
    type === "YOUTUBE_SUBSCRIBERS" ||
    type === "YOUTUBE_VIEWS" ||
    type === "TWITCH_FOLLOWERS" ||
    type === "TIKTOK_FOLLOWERS" ||
    type === "INSTAGRAM_FOLLOWERS" ||
    type === "KICK_FOLLOWERS" ||
    type === "X_FOLLOWERS"
  );
}

export async function readSocialStat(input: {
  type: DashboardStatsChannelType;
  sourceIdentifier: string;
}): Promise<SocialStatsResult> {
  if (
    input.type === "YOUTUBE_SUBSCRIBERS" ||
    input.type === "YOUTUBE_VIEWS"
  ) {
    return readYoutubeStat(input.type, input.sourceIdentifier);
  }

  if (!input.sourceIdentifier.trim()) {
    return { ok: false, reason: "social_source_missing" };
  }

  return { ok: false, reason: "provider_not_configured" };
}
