import {
  EmbedBuilder,
  PermissionFlagsBits,
  type Client,
} from "discord.js";

import type { BotConfig } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import {
  createDashboardSyncClient,
  type DashboardYoutubeNotificationsConfig,
  type DashboardYoutubeSubscriptionConfig,
} from "../dashboardSync/dashboardSyncClient.js";

type YoutubeFeedItem = {
  videoId: string;
  title: string;
  url: string;
  publishedAt: string;
  isLivestream: boolean;
};

let workerStarted = false;
let workerRunning = false;
const seenItems = new Map<string, Set<string>>();

function embedColor(value: string | undefined) {
  const colors: Record<string, number> = {
    "klarapps-teal": 0x14b8a6,
    blue: 0x3b82f6,
    purple: 0xa855f7,
    green: 0x22c55e,
    yellow: 0xeab308,
    red: 0xef4444,
    gray: 0x64748b,
  };

  return colors[value?.trim() ?? ""] ?? colors.red;
}

function pollIntervalMs() {
  const value = Number(process.env.KLARBOT_YOUTUBE_POLL_INTERVAL_MS ?? 300_000);

  return Number.isFinite(value) && value >= 60_000 ? value : 300_000;
}

function decodeXml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function readTag(block: string, tagName: string) {
  const match = block.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));

  return decodeXml(match?.[1]?.trim() ?? "");
}

function readLink(block: string) {
  const match = block.match(/<link[^>]+href="([^"]+)"/i);

  return decodeXml(match?.[1]?.trim() ?? "");
}

function parseFeed(xml: string): YoutubeFeedItem[] {
  const entries = xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];

  return entries
    .map((entry) => {
      const videoId = readTag(entry, "yt:videoId");
      const title = readTag(entry, "title");
      const url = readLink(entry) || `https://www.youtube.com/watch?v=${videoId}`;
      const publishedAt = readTag(entry, "published");

      return {
        videoId,
        title,
        url,
        publishedAt,
        isLivestream: false,
      };
    })
    .filter((item) => item.videoId && item.title && item.url);
}

async function classifyItems(items: YoutubeFeedItem[]) {
  const apiKey = process.env.YOUTUBE_DATA_API_KEY?.trim();

  if (!apiKey || items.length === 0) {
    return items;
  }

  const ids = items.map((item) => item.videoId).join(",");
  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=${encodeURIComponent(ids)}&key=${encodeURIComponent(apiKey)}`,
  ).catch(() => null);

  if (!response?.ok) {
    return items;
  }

  const payload = (await response.json().catch(() => null)) as
    | {
        items?: Array<{
          id?: string;
          snippet?: {
            liveBroadcastContent?: string;
          };
          liveStreamingDetails?: Record<string, unknown>;
        }>;
      }
    | null;
  const liveIds = new Set(
    (payload?.items ?? [])
      .filter(
        (item) =>
          item.snippet?.liveBroadcastContent === "live" ||
          item.snippet?.liveBroadcastContent === "upcoming" ||
          Boolean(item.liveStreamingDetails),
      )
      .map((item) => item.id)
      .filter((id): id is string => Boolean(id)),
  );

  return items.map((item) => ({
    ...item,
    isLivestream: liveIds.has(item.videoId),
  }));
}

async function fetchLatestItems(channelId: string) {
  const response = await fetch(
    `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`,
  );

  if (!response.ok) {
    throw new Error(`youtube_feed_http_${response.status}`);
  }

  const xml = await response.text();

  return classifyItems(parseFeed(xml));
}

function renderMessage(
  template: string,
  subscription: DashboardYoutubeSubscriptionConfig,
  item: YoutubeFeedItem,
) {
  const channelName = subscription.displayName || subscription.youtubeChannelId;

  return template
    .replaceAll("{channelName}", channelName)
    .replaceAll("{videoTitle}", item.title)
    .replaceAll("{videoUrl}", item.url);
}

function buildEmbed(
  subscription: DashboardYoutubeSubscriptionConfig,
  item: YoutubeFeedItem,
) {
  const channelName = subscription.displayName || subscription.youtubeChannelId;

  return new EmbedBuilder()
    .setColor(embedColor(subscription.embedColor))
    .setTitle(item.title)
    .setURL(item.url)
    .setDescription(
      item.isLivestream
        ? `Livestream von ${channelName}`
        : `Neues Video von ${channelName}`,
    )
    .setFooter({ text: "KlarBot YouTube" })
    .setTimestamp(item.publishedAt ? new Date(item.publishedAt) : new Date());
}

async function sendNotification(
  client: Client,
  guildId: string,
  subscription: DashboardYoutubeSubscriptionConfig,
  item: YoutubeFeedItem,
) {
  const channel = await client.channels
    .fetch(subscription.targetChannelId)
    .catch(() => null);

  if (!channel || !("send" in channel) || typeof channel.send !== "function") {
    logger.warn(
      `[youtube] notify skipped | guildId=${guildId} | reason=channel_not_found | targetChannelId=${subscription.targetChannelId}`,
    );
    return false;
  }

  if ("guildId" in channel && channel.guildId !== guildId) {
    logger.warn(
      `[youtube] notify skipped | guildId=${guildId} | reason=channel_wrong_guild`,
    );
    return false;
  }

  const permissions =
    "permissionsFor" in channel && client.user
      ? channel.permissionsFor(client.user)
      : null;

  if (
    permissions &&
    !permissions.has([
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.EmbedLinks,
    ])
  ) {
    logger.warn(
      `[youtube] notify skipped | guildId=${guildId} | reason=missing_permissions | targetChannelId=${subscription.targetChannelId}`,
    );
    return false;
  }

  const template = item.isLivestream
    ? subscription.livestreamMessage
    : subscription.videoMessage;
  const ping = subscription.pingRoleId ? `<@&${subscription.pingRoleId}>\n` : "";

  await channel.send({
    content: `${ping}${renderMessage(template, subscription, item)}`.trim(),
    embeds: [buildEmbed(subscription, item)],
    allowedMentions: {
      roles: subscription.pingRoleId ? [subscription.pingRoleId] : [],
    },
  });

  logger.success(
    `[youtube] notification sent | guildId=${guildId} | channelId=${subscription.targetChannelId} | videoId=${item.videoId} | livestream=${item.isLivestream}`,
  );
  return true;
}

function shouldSend(
  subscription: DashboardYoutubeSubscriptionConfig,
  item: YoutubeFeedItem,
) {
  if (item.isLivestream) {
    return subscription.notifyLivestreams;
  }

  return subscription.notifyVideos;
}

async function processSubscription(
  client: Client,
  guildId: string,
  subscription: DashboardYoutubeSubscriptionConfig,
) {
  const key = `${guildId}:${subscription.id}`;
  const known = seenItems.get(key) ?? new Set<string>();
  const items = await fetchLatestItems(subscription.youtubeChannelId);

  if (!seenItems.has(key)) {
    seenItems.set(
      key,
      new Set(items.slice(0, 10).map((item) => item.videoId)),
    );
    logger.info(
      `[youtube] baseline loaded | guildId=${guildId} | subscription=${subscription.id} | items=${items.length}`,
    );
    return;
  }

  for (const item of [...items].reverse()) {
    if (known.has(item.videoId)) {
      continue;
    }

    known.add(item.videoId);

    if (shouldSend(subscription, item)) {
      await sendNotification(client, guildId, subscription, item);
    }
  }

  seenItems.set(key, new Set([...known].slice(-50)));
}

export async function publishYoutubeNotificationsForGuild(
  client: Client,
  guildId: string,
  youtubeConfig: DashboardYoutubeNotificationsConfig,
) {
  logger.info(
    `[youtube] publish job received | guildId=${guildId} | subscriptions=${youtubeConfig.subscriptions.length}`,
  );

  const guild = await client.guilds.fetch(guildId).catch(() => null);

  if (!guild) {
    return {
      ok: false as const,
      reason: "guild_not_found",
    };
  }

  const activeSubscriptions = youtubeConfig.subscriptions.filter(
    (subscription) =>
      subscription.enabled &&
      subscription.youtubeChannelId &&
      subscription.targetChannelId &&
      (subscription.notifyVideos || subscription.notifyLivestreams),
  );

  if (activeSubscriptions.length === 0) {
    return {
      ok: false as const,
      reason: "no_active_youtube_subscriptions",
    };
  }

  logger.info(
    `[youtube] WebSub vorbereitet | guildId=${guildId} | callbackConfigured=${process.env.KLARBOT_YOUTUBE_WEBSUB_CALLBACK_URL ? "true" : "false"} | fallbackPolling=${youtubeConfig.fallbackPollingEnabled}`,
  );

  return {
    ok: true as const,
    channelId: activeSubscriptions[0]?.targetChannelId ?? null,
    subscriptionCount: activeSubscriptions.length,
  };
}

async function processGuild(client: Client, config: BotConfig, guildId: string) {
  const syncClient = createDashboardSyncClient(config);
  const result = await syncClient.readYoutubeNotificationsConfig(guildId);

  if (!result.ok) {
    return;
  }

  const youtubeConfig = result.payload.youtubeNotificationsConfig;

  if (!youtubeConfig.enabled || !youtubeConfig.fallbackPollingEnabled) {
    return;
  }

  for (const subscription of youtubeConfig.subscriptions) {
    if (
      !subscription.enabled ||
      !subscription.youtubeChannelId ||
      !subscription.targetChannelId
    ) {
      continue;
    }

    try {
      await processSubscription(client, guildId, subscription);
    } catch (error) {
      logger.warn(
        `[youtube] subscription failed | guildId=${guildId} | subscription=${subscription.id} | error=${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

async function processYoutubeNotifications(client: Client, config: BotConfig) {
  if (workerRunning) {
    return;
  }

  workerRunning = true;

  try {
    const guilds = await client.guilds.fetch();

    for (const [guildId] of guilds) {
      await processGuild(client, config, guildId);
    }
  } catch (error) {
    logger.warn(
      `[youtube] worker failed | error=${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    workerRunning = false;
  }
}

export function startYoutubeNotificationWorker(client: Client, config: BotConfig) {
  if (workerStarted) {
    return;
  }

  workerStarted = true;
  const intervalMs = pollIntervalMs();

  logger.info(
    `[youtube] notification worker active | intervalMs=${intervalMs} | dataApiKey=${process.env.YOUTUBE_DATA_API_KEY ? "configured" : "missing"} | webSubCallback=${process.env.KLARBOT_YOUTUBE_WEBSUB_CALLBACK_URL ? "configured" : "missing"}`,
  );

  void processYoutubeNotifications(client, config);

  const interval = setInterval(() => {
    void processYoutubeNotifications(client, config);
  }, intervalMs);

  interval.unref?.();
}
