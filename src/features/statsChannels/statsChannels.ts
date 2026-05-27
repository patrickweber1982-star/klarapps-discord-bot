import {
  ChannelType,
  PermissionFlagsBits,
  type Client,
  type Guild,
  type GuildBasedChannel,
  type OverwriteResolvable,
} from "discord.js";

import type { BotConfig } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import {
  createDashboardSyncClient,
  type DashboardStatsChannelConfig,
  type DashboardStatsChannelLogEntry,
  type DashboardStatsChannelsConfig,
  type DashboardStatsChannelType,
} from "../dashboardSync/dashboardSyncClient.js";
import { isSocialStatsType, readSocialStat } from "./socialStatsProviders.js";

const statsConfigCache = new Map<string, DashboardStatsChannelsConfig>();
const statsUpdateTimestamps = new Map<string, number>();
const discordStatsCache = new Map<string, { value: number; expiresAt: number }>();
let updaterStarted = false;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function readIntervalMinutes(value: string | undefined) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return 15;

  return Math.min(30, Math.max(10, parsed));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("de-DE").format(value);
}

function statsLog(input: {
  channel: DashboardStatsChannelConfig;
  status: DashboardStatsChannelLogEntry["status"];
  message: string;
}): DashboardStatsChannelLogEntry {
  return {
    id: `stats-log-${Date.now()}-${input.channel.id}`,
    channelId: input.channel.id,
    type: input.channel.type,
    status: input.status,
    message: input.message,
    createdAt: new Date().toISOString(),
  };
}

function cacheKey(guildId: string, type: DashboardStatsChannelType) {
  return `${guildId}:${type}`;
}

async function readCachedDiscordStat(
  guild: Guild,
  type: DashboardStatsChannelType,
) {
  const key = cacheKey(guild.id, type);
  const cached = discordStatsCache.get(key);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const value = await computeStatValue(guild, type);
  discordStatsCache.set(key, {
    value,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  return value;
}

function formatChannelName(
  channel: DashboardStatsChannelConfig,
  value: number | null,
  layoutStyle: DashboardStatsChannelsConfig["layoutStyle"] = "compact",
) {
  const emoji = channel.emoji.trim();
  const label = channel.label.trim() || "Stat";
  const displayValue = value === null ? "--" : formatNumber(value);
  const prefix = emoji ? `${emoji} ` : "";
  const safeLayout = layoutStyle ?? "compact";
  const name =
    safeLayout === "minimal"
      ? `${prefix}${label} ${displayValue}`
      : safeLayout === "modern"
        ? `╭${prefix}${label} ╰ ${displayValue}`
        : safeLayout === "centered"
          ? `• ${prefix}${label} • ${displayValue} •`
          : safeLayout === "separator"
            ? `━━━━ ${prefix}${label}: ${displayValue}`
            : safeLayout === "boxed"
              ? `▣ ${prefix}${label} • ${displayValue}`
              : `${prefix}${label} • ${displayValue}`;

  return name.replace(/[\r\n]+/g, " ").replace(/\s{2,}/g, " ").slice(0, 100);
}

function isGuildChannel(value: GuildBasedChannel | null | undefined) {
  return Boolean(value && "guild" in value && "setName" in value);
}

async function fetchBotMember(guild: Guild) {
  return guild.members.fetchMe().catch(() => null);
}

async function computeStatValue(guild: Guild, type: DashboardStatsChannelType) {
  if (type === "MEMBERS_TOTAL") {
    return guild.memberCount ?? guild.members.cache.size;
  }

  if (type === "MEMBERS_ONLINE") {
    return guild.members.cache.filter(
      (member) => member.presence && member.presence.status !== "offline",
    ).size;
  }

  if (type === "BOTS_TOTAL") {
    const members = await guild.members.fetch().catch(() => null);
    const source = members ?? guild.members.cache;

    return source.filter((member) => member.user.bot).size;
  }

  if (type === "ROLES_TOTAL") {
    return guild.roles.cache.filter((role) => role.id !== guild.id).size;
  }

  if (type === "CHANNELS_TOTAL") {
    return guild.channels.cache.filter((channel) => !channel.isThread()).size;
  }

  return guild.premiumSubscriptionCount ?? 0;
}

async function resolveStatValue(
  guild: Guild,
  channel: DashboardStatsChannelConfig,
): Promise<{ value: number | null; lastError: string }> {
  if (isSocialStatsType(channel.type)) {
    const result = await readSocialStat({
      type: channel.type,
      sourceIdentifier: channel.sourceIdentifier,
    });

    if (!result.ok) {
      logger.warn(
        `[stats-channels] social stat unavailable | guildId=${guild.id} | type=${channel.type} | source=${channel.sourceIdentifier || "missing"} | reason=${result.reason}`,
      );
      return {
        value: null,
        lastError: result.reason,
      };
    }

    return {
      value: result.value,
      lastError: "",
    };
  }

  return {
    value: await readCachedDiscordStat(guild, channel.type),
    lastError: "",
  };
}

function categoryPermissionOverwrites(guild: Guild, visibleRoleId: string) {
  if (!visibleRoleId) return undefined;

  return [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: visibleRoleId,
      allow: [PermissionFlagsBits.ViewChannel],
    },
  ] satisfies OverwriteResolvable[];
}

function voicePermissionOverwrites(guild: Guild, visibleRoleId: string) {
  const overwrites: OverwriteResolvable[] = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.Connect],
    },
  ];

  if (visibleRoleId) {
    overwrites.push({
      id: visibleRoleId,
      allow: [PermissionFlagsBits.ViewChannel],
      deny: [PermissionFlagsBits.Connect],
    });
  }

  return overwrites;
}

async function ensureCategory(
  guild: Guild,
  categoryConfig: DashboardStatsChannelsConfig["categories"][number],
) {
  const name = categoryConfig.name.trim().slice(0, 100);

  if (!name || !categoryConfig.enabled) {
    return null;
  }

  await guild.channels.fetch().catch(() => null);
  const existing = guild.channels.cache.find(
    (channel) =>
      channel.type === ChannelType.GuildCategory &&
      channel.name.toLowerCase() === name.toLowerCase(),
  );

  if (existing) {
    return existing;
  }

  const created = await guild.channels.create({
    name,
    type: ChannelType.GuildCategory,
    permissionOverwrites: categoryPermissionOverwrites(
      guild,
      categoryConfig.visibleRoleId,
    ),
    reason: "KlarApps Dashboard Statistik-Kanaele",
  });

  logger.info(
    `[stats-channels] category created | guildId=${guild.id} | requestedName=${name} | createdName=${created.name}`,
  );

  return created;
}

async function resolveStatsChannel(
  guild: Guild,
  channelConfig: DashboardStatsChannelConfig,
): Promise<GuildBasedChannel | null> {
  if (!channelConfig.discordChannelId) {
    return null;
  }

  const channel = await guild.channels
    .fetch(channelConfig.discordChannelId)
    .catch(() => null);

  return isGuildChannel(channel) ? channel : null;
}

async function upsertStatsChannel(input: {
  guild: Guild;
  channelConfig: DashboardStatsChannelConfig;
  categoryChannel: GuildBasedChannel | null;
  visibleRoleId: string;
  createMissing: boolean;
  layoutStyle: DashboardStatsChannelsConfig["layoutStyle"];
}) {
  const statValue = await resolveStatValue(input.guild, input.channelConfig);
  const existingLastValue = Number(input.channelConfig.lastValue);
  const displayValue =
    statValue.value === null && Number.isFinite(existingLastValue)
      ? existingLastValue
      : statValue.value;
  const targetName = formatChannelName(
    input.channelConfig,
    displayValue,
    input.layoutStyle,
  );
  let channel = await resolveStatsChannel(input.guild, input.channelConfig);
  const now = new Date().toISOString();

  if (!channel && !input.createMissing) {
    logger.warn(
      `[stats-channels] update skipped | guildId=${input.guild.id} | stat=${input.channelConfig.type} | reason=channel_missing | discordChannelId=${input.channelConfig.discordChannelId || "none"}`,
    );
    return {
      ...input.channelConfig,
      discordChannelId: "",
      lastError: "channel_missing",
      lastUpdateAt: now,
      lastErrorAt: now,
      lastErrorMessage: "Discord Channel wurde nicht gefunden.",
      updateStatus: "error" as const,
    };
  }

  if (!channel) {
    channel = await input.guild.channels.create({
      name: targetName,
      type: ChannelType.GuildVoice,
      parent: input.categoryChannel?.id,
      permissionOverwrites: voicePermissionOverwrites(
        input.guild,
        input.visibleRoleId,
      ),
      reason: "KlarApps Dashboard Statistik-Kanaele",
    });
    logger.info(
      `[stats-channels] channel created | guildId=${input.guild.id} | type=${input.channelConfig.type} | requestedName=${targetName} | createdName=${channel.name} | channelId=${channel.id}`,
    );
  } else if (
    "setName" in channel &&
    channel.name !== targetName &&
    (statValue.value !== null || !input.channelConfig.lastValue)
  ) {
    await channel.setName(targetName, "KlarApps Statistikkanal Update");
    logger.info(
      `[stats-channels] channel updated | guildId=${input.guild.id} | type=${input.channelConfig.type} | channelId=${channel.id} | name=${targetName}`,
    );
  }

  const failed = Boolean(statValue.lastError);

  return {
    ...input.channelConfig,
    discordChannelId: channel.id,
    lastError: statValue.lastError,
    lastValue: statValue.value === null ? input.channelConfig.lastValue : String(statValue.value),
    lastUpdateAt: now,
    lastSuccessAt: failed ? input.channelConfig.lastSuccessAt : now,
    lastErrorAt: failed ? now : "",
    lastErrorMessage: failed ? statValue.lastError : "",
    updateStatus: failed ? ("error" as const) : ("success" as const),
  };
}

async function applyStatsChannelsConfig(input: {
  client: Client;
  guildId: string;
  statsChannelsConfig: DashboardStatsChannelsConfig;
  createMissing: boolean;
}) {
  const { client, guildId, statsChannelsConfig, createMissing } = input;

  logger.info(
    `[stats-channels] publish job received | guildId=${guildId} | categories=${statsChannelsConfig.categories.length} | channels=${statsChannelsConfig.channels.length}`,
  );

  const guild = await client.guilds.fetch(guildId).catch(() => null);

  if (!guild) {
    logger.warn(
      `[stats-channels] apply failed | guildId=${guildId} | reason=guild_not_found`,
    );
    return { ok: false as const, reason: "guild_not_found" };
  }

  const member = await fetchBotMember(guild);

  if (!member) {
    logger.warn(
      `[stats-channels] apply failed | guildId=${guildId} | reason=bot_member_not_found`,
    );
    return { ok: false as const, reason: "bot_member_not_found" };
  }

  if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
    logger.warn(
      `[stats-channels] apply failed | guildId=${guildId} | reason=missing_manage_channels_permission`,
    );
    return {
      ok: false as const,
      reason: "missing_manage_channels_permission",
    };
  }

  const categoryMap = new Map<string, GuildBasedChannel | null>();

  for (const category of statsChannelsConfig.categories) {
    const createdCategory = await ensureCategory(guild, category);
    categoryMap.set(category.id, createdCategory);
  }

  const categoriesById = new Map(
    statsChannelsConfig.categories.map((category) => [category.id, category]),
  );
  const nextChannels: DashboardStatsChannelConfig[] = [];
  const logs: DashboardStatsChannelLogEntry[] = [];
  let updatedChannels = 0;

  for (const channel of statsChannelsConfig.channels) {
    const category = categoriesById.get(channel.categoryId);

    if (!channel.enabled || !category?.enabled) {
      nextChannels.push({
        ...channel,
        updateStatus: "disabled",
      });
      continue;
    }

    try {
      const nextChannel = await upsertStatsChannel({
        guild,
        channelConfig: channel,
        categoryChannel: categoryMap.get(channel.categoryId) ?? null,
        visibleRoleId: category.visibleRoleId,
        createMissing,
        layoutStyle: statsChannelsConfig.layoutStyle,
      });

      nextChannels.push(nextChannel);
      updatedChannels += 1;
      logs.push(
        statsLog({
          channel,
          status: nextChannel.updateStatus === "error" ? "error" : "success",
          message:
            nextChannel.updateStatus === "error"
              ? nextChannel.lastErrorMessage || "Update fehlgeschlagen."
              : `Aktualisiert: ${nextChannel.lastValue || "0"}`,
        }),
      );
    } catch (error) {
      logger.warn(
        `[stats-channels] channel update failed | guildId=${guildId} | stat=${channel.type} | reason=${errorMessage(error)}`,
      );
      const now = new Date().toISOString();
      nextChannels.push({
        ...channel,
        lastUpdateAt: now,
        lastErrorAt: now,
        lastErrorMessage: errorMessage(error),
        lastError: errorMessage(error),
        updateStatus: "error",
      });
      logs.push(
        statsLog({
          channel,
          status: "error",
          message: errorMessage(error),
        }),
      );
    }
  }

  const nextConfig = {
    ...statsChannelsConfig,
    enabled: true,
    channels: nextChannels,
    logs: [...logs, ...statsChannelsConfig.logs].slice(0, 100),
  };
  statsConfigCache.set(guildId, nextConfig);
  statsUpdateTimestamps.set(guildId, Date.now());

  logger.success(
    `[stats-channels] apply success | guildId=${guildId} | updatedChannels=${updatedChannels}`,
  );

  return {
    ok: true as const,
    channelId: null,
    statsChannelsConfig: nextConfig,
    channelUpdates: nextChannels,
    logs,
  };
}

async function loadActiveStatsChannelsConfig(guildId: string, config: BotConfig) {
  const cached = statsConfigCache.get(guildId);

  if (cached?.enabled) {
    return cached;
  }

  const syncClient = createDashboardSyncClient(config);
  const result = await syncClient.readStatsChannelsConfig(guildId);

  if (!result.ok) {
    logger.warn(
      `[stats-channels] config load failed | guildId=${guildId} | reason=${result.message}`,
    );
    return null;
  }

  const statsConfig = result.payload.statsChannelsConfig;

  if (!statsConfig.enabled) {
    logger.info(
      `[stats-channels] config inactive | guildId=${guildId} | channels=${statsConfig.channels.length}`,
    );
    return null;
  }

  statsConfigCache.set(guildId, statsConfig);

  return statsConfig;
}

export async function publishStatsChannelsForGuild(
  client: Client,
  guildId: string,
  statsChannelsConfig: DashboardStatsChannelsConfig,
) {
  return applyStatsChannelsConfig({
    client,
    guildId,
    statsChannelsConfig,
    createMissing: true,
  });
}

export function startStatsChannelsUpdater(client: Client, config: BotConfig) {
  if (updaterStarted) {
    return;
  }

  updaterStarted = true;
  const intervalMs = 10 * 60 * 1000;

  logger.info(`[stats-channels] updater active | intervalMs=${intervalMs}`);

  const run = async () => {
    const syncClient = createDashboardSyncClient(config);

    for (const guild of client.guilds.cache.values()) {
      try {
        const statsConfig = await loadActiveStatsChannelsConfig(guild.id, config);

        if (!statsConfig) continue;

        const intervalMinutes = readIntervalMinutes(
          statsConfig.updateIntervalMinutes,
        );
        const lastUpdatedAt = statsUpdateTimestamps.get(guild.id) ?? 0;

        if (Date.now() - lastUpdatedAt < intervalMinutes * 60 * 1000) {
          continue;
        }

        const result = await applyStatsChannelsConfig({
          client,
          guildId: guild.id,
          statsChannelsConfig: statsConfig,
          createMissing: false,
        });

        if (result.ok) {
          const report = await syncClient.reportStatsChannelsStatus({
            guildId: guild.id,
            channelUpdates: result.channelUpdates,
            logs: result.logs,
          });

          if (!report.ok) {
            logger.warn(
              `[stats-channels] status report failed | guildId=${guild.id} | reason=${report.message}`,
            );
          }
        }
      } catch (error) {
        logger.warn(
          `[stats-channels] updater failed | guildId=${guild.id} | reason=${errorMessage(error)}`,
        );
      }
    }
  };

  void run();
  const interval = setInterval(() => {
    void run();
  }, intervalMs);

  interval.unref?.();
}
