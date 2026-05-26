import {
  EmbedBuilder,
  Events,
  PermissionFlagsBits,
  type Client,
  type GuildMember,
  type Message,
} from "discord.js";

import type { BotConfig } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import {
  createDashboardSyncClient,
  type DashboardAutoDeleteConfig,
  type DashboardAutoDeleteRuleConfig,
} from "../dashboardSync/dashboardSyncClient.js";

const configCache = new Map<
  string,
  {
    loadedAt: number;
    config: DashboardAutoDeleteConfig | null;
  }
>();
const cleanupTimers = new Set<string>();

function readNumber(value: string, fallback: number) {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

async function loadAutoDeleteConfig(guildId: string, config: BotConfig) {
  const cached = configCache.get(guildId);

  if (cached && Date.now() - cached.loadedAt < 30_000) {
    return cached.config;
  }

  const syncClient = createDashboardSyncClient(config);
  const result = await syncClient.readAutoDeleteConfig(guildId);

  if (!result.ok) {
    configCache.set(guildId, { loadedAt: Date.now(), config: null });
    return null;
  }

  configCache.set(guildId, {
    loadedAt: Date.now(),
    config: result.payload.autoDeleteConfig,
  });

  return result.payload.autoDeleteConfig;
}

function memberHasIgnoredRole(
  member: GuildMember | null,
  ignoredRoleIds: string[],
) {
  if (!member || ignoredRoleIds.length === 0) return false;

  return ignoredRoleIds.some((roleId) => member.roles.cache.has(roleId));
}

function ruleMatchesChannel(rule: DashboardAutoDeleteRuleConfig, message: Message) {
  if (rule.targetChannelIds.length === 0 && rule.targetCategoryIds.length === 0) {
    return true;
  }

  if (rule.targetChannelIds.includes(message.channelId)) {
    return true;
  }

  const parentId =
    "parentId" in message.channel && typeof message.channel.parentId === "string"
      ? message.channel.parentId
      : null;

  return Boolean(parentId && rule.targetCategoryIds.includes(parentId));
}

function hasLink(content: string) {
  return /https?:\/\/|www\./i.test(content);
}

function hasDiscordInvite(content: string) {
  return /discord(?:\.gg|\.com\/invite)\/[a-z0-9-]+/i.test(content);
}

function bannedWords(rule: DashboardAutoDeleteRuleConfig) {
  return rule.bannedWords
    .split(/[\n,]/)
    .map((word) => word.trim().toLowerCase())
    .filter(Boolean);
}

function hasBannedWord(content: string, rule: DashboardAutoDeleteRuleConfig) {
  const normalized = content.toLowerCase();

  return bannedWords(rule).some((word) => normalized.includes(word));
}

function capsRatio(content: string) {
  const letters = [...content].filter((char) => /[a-zA-ZÄÖÜäöüß]/.test(char));

  if (letters.length < 8) return 0;

  const upper = letters.filter((char) => char === char.toUpperCase()).length;

  return Math.round((upper / letters.length) * 100);
}

function emojiCount(content: string) {
  const matches = content.match(/\p{Extended_Pictographic}/gu);

  return matches?.length ?? 0;
}

function hasAttachment(message: Message) {
  return message.attachments.size > 0 || message.embeds.length > 0;
}

function violationReason(rule: DashboardAutoDeleteRuleConfig, message: Message) {
  const content = message.content ?? "";

  if (rule.type === "links" && hasLink(content)) return "Link erkannt";
  if (rule.type === "discord_invites" && hasDiscordInvite(content)) {
    return "Discord Invite erkannt";
  }
  if (rule.type === "words" && hasBannedWord(content, rule)) {
    return "Wortfilter";
  }
  if (
    rule.type === "caps_spam" &&
    capsRatio(content) >= readNumber(rule.capsThreshold, 70)
  ) {
    return "Caps Spam";
  }
  if (
    rule.type === "emoji_spam" &&
    emojiCount(content) > readNumber(rule.emojiThreshold, 8)
  ) {
    return "Emoji Spam";
  }
  if (rule.type === "delete_after_seconds") return "Zeitgesteuertes Loeschen";
  if (rule.type === "media_only" && !hasAttachment(message) && content.trim()) {
    return "Nur Medien erlaubt";
  }

  return null;
}

async function sendWarning(message: Message, rule: DashboardAutoDeleteRuleConfig) {
  if (!("send" in message.channel) || typeof message.channel.send !== "function") {
    return;
  }

  const warning = await message.channel
    .send({
      content: `${message.author}, deine Nachricht wurde entfernt. Grund: ${rule.name}`,
      allowedMentions: { users: [message.author.id] },
    })
    .catch(() => null);

  if (warning) {
    setTimeout(() => {
      void warning.delete().catch(() => null);
    }, 8_000).unref?.();
  }
}

async function sendLog(
  client: Client,
  config: DashboardAutoDeleteConfig,
  message: Message,
  rule: DashboardAutoDeleteRuleConfig,
  reason: string,
) {
  if (!config.logChannelId || !rule.logAction) return;

  const channel = await client.channels.fetch(config.logChannelId).catch(() => null);

  if (!channel || !("send" in channel) || typeof channel.send !== "function") {
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x22d3ee)
    .setTitle("Nachricht geloescht")
    .setDescription(message.content?.slice(0, 1000) || "Kein Textinhalt")
    .addFields(
      { name: "Grund", value: reason, inline: true },
      { name: "Regel", value: rule.name, inline: true },
      { name: "User", value: `${message.author.tag} (${message.author.id})` },
      { name: "Channel", value: `<#${message.channelId}>`, inline: true },
    )
    .setTimestamp(new Date());

  await channel.send({ embeds: [embed] }).catch(() => null);
}

async function deleteMessage(
  client: Client,
  config: DashboardAutoDeleteConfig,
  message: Message,
  rule: DashboardAutoDeleteRuleConfig,
  reason: string,
) {
  if (cleanupTimers.has(message.id)) return;

  cleanupTimers.add(message.id);
  const delay = Math.max(0, readNumber(rule.deleteDelaySeconds, 0)) * 1000;

  setTimeout(async () => {
    try {
      if (message.deletable) {
        await message.delete();
        logger.info(
          `[auto-delete] message deleted | guildId=${message.guildId} | channelId=${message.channelId} | rule=${rule.id} | reason=${reason}`,
        );

        if (rule.warnUser) {
          await sendWarning(message, rule);
        }

        await sendLog(client, config, message, rule, reason);
      } else {
        logger.warn(
          `[auto-delete] delete skipped | guildId=${message.guildId} | channelId=${message.channelId} | reason=not_deletable`,
        );
      }
    } catch (error) {
      logger.warn(
        `[auto-delete] delete failed | guildId=${message.guildId} | channelId=${message.channelId} | error=${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      cleanupTimers.delete(message.id);
    }
  }, delay).unref?.();
}

export async function publishAutoDeleteConfigForGuild(
  client: Client,
  guildId: string,
  autoDeleteConfig: DashboardAutoDeleteConfig,
) {
  logger.info(
    `[auto-delete] publish job received | guildId=${guildId} | rules=${autoDeleteConfig.rules.length}`,
  );

  const guild = await client.guilds.fetch(guildId).catch(() => null);

  if (!guild) {
    return { ok: false as const, reason: "guild_not_found" };
  }

  const botMember = await guild.members.fetchMe().catch(() => null);

  if (!botMember?.permissions.has(PermissionFlagsBits.ManageMessages)) {
    return { ok: false as const, reason: "missing_manage_messages" };
  }

  configCache.set(guildId, {
    loadedAt: Date.now(),
    config: autoDeleteConfig,
  });

  return {
    ok: true as const,
    channelId: autoDeleteConfig.logChannelId || null,
    rules: autoDeleteConfig.rules.length,
  };
}

export function registerAutoDeleteMessageCreateEvent(
  client: Client,
  botConfig: BotConfig,
) {
  client.on(Events.MessageCreate, async (message) => {
    if (!message.guild || !message.guildId || message.author.id === client.user?.id) {
      return;
    }

    const config = await loadAutoDeleteConfig(message.guildId, botConfig);

    if (!config?.enabled) return;
    if (config.ignoreBots && message.author.bot) return;

    const member =
      message.member ??
      (await message.guild.members.fetch(message.author.id).catch(() => null));

    if (config.ignoreAdmins && member?.permissions.has(PermissionFlagsBits.Administrator)) {
      return;
    }

    if (memberHasIgnoredRole(member, config.ignoredRoleIds)) {
      return;
    }

    for (const rule of config.rules) {
      if (!rule.enabled || !ruleMatchesChannel(rule, message)) {
        continue;
      }

      const reason = violationReason(rule, message);

      if (!reason) {
        continue;
      }

      await deleteMessage(client, config, message, rule, reason);
      return;
    }
  });

  logger.info("[auto-delete] messageCreate handler registered");
}
