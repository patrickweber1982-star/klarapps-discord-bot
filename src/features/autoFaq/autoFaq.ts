import { Events, type Client, type GuildMember, type Message } from "discord.js";

import type { BotConfig } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import {
  createDashboardSyncClient,
  type DashboardAutoFaqConfig,
  type DashboardAutoFaqRuleConfig,
} from "../dashboardSync/dashboardSyncClient.js";

const configCache = new Map<
  string,
  {
    loadedAt: number;
    config: DashboardAutoFaqConfig | null;
  }
>();
const cooldowns = new Map<string, number>();

function readNumber(value: string, fallback: number) {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

async function loadAutoFaqConfig(guildId: string, config: BotConfig) {
  const cached = configCache.get(guildId);

  if (cached && Date.now() - cached.loadedAt < 30_000) {
    return cached.config;
  }

  const syncClient = createDashboardSyncClient(config);
  const result = await syncClient.readAutoFaqConfig(guildId);

  if (!result.ok) {
    configCache.set(guildId, { loadedAt: Date.now(), config: null });
    logger.info(
      `[auto-faq] config missing | guildId=${guildId} | reason=${result.message}`,
    );
    return null;
  }

  configCache.set(guildId, {
    loadedAt: Date.now(),
    config: result.payload.autoFaqConfig,
  });

  return result.payload.autoFaqConfig;
}

function memberHasIgnoredRole(
  member: GuildMember | null,
  ignoredRoleIds: string[],
) {
  if (!member || ignoredRoleIds.length === 0) return false;

  return ignoredRoleIds.some((roleId) => member.roles.cache.has(roleId));
}

function ruleMatchesChannel(rule: DashboardAutoFaqRuleConfig, message: Message) {
  return rule.channelIds.length === 0 || rule.channelIds.includes(message.channelId);
}

function ruleMatchesContent(rule: DashboardAutoFaqRuleConfig, content: string) {
  const normalizedContent = content.trim().toLowerCase();

  if (!normalizedContent) return false;

  return rule.triggers
    .map((trigger) => trigger.trim().toLowerCase())
    .filter(Boolean)
    .some((trigger) => normalizedContent.includes(trigger));
}

function isOnCooldown(
  guildId: string,
  userId: string,
  rule: DashboardAutoFaqRuleConfig,
) {
  const cooldownSeconds = Math.max(0, readNumber(rule.cooldownSeconds, 30));

  if (cooldownSeconds === 0) return false;

  const key = `${guildId}:${rule.id}:${userId}`;
  const now = Date.now();
  const lastReplyAt = cooldowns.get(key) ?? 0;

  if (now - lastReplyAt < cooldownSeconds * 1000) {
    return true;
  }

  cooldowns.set(key, now);

  return false;
}

async function sendAutoFaqReply(
  message: Message,
  rule: DashboardAutoFaqRuleConfig,
) {
  if (!rule.answerText.trim()) return false;

  await message.reply({
    content: rule.answerText.slice(0, 2000),
    allowedMentions: {
      repliedUser: false,
      parse: [],
    },
  });

  return true;
}

export async function publishAutoFaqConfigForGuild(
  client: Client,
  guildId: string,
  autoFaqConfig: DashboardAutoFaqConfig,
) {
  logger.info(
    `[auto-faq] publish job received | guildId=${guildId} | rules=${autoFaqConfig.rules.length}`,
  );

  const guild = await client.guilds.fetch(guildId).catch(() => null);

  if (!guild) {
    return { ok: false as const, reason: "guild_not_found" };
  }

  const publishableRules = autoFaqConfig.rules.filter(
    (rule) =>
      rule.enabled &&
      rule.triggers.some((trigger) => trigger.trim()) &&
      rule.answerText.trim(),
  );

  if (publishableRules.length === 0) {
    return { ok: false as const, reason: "no_publishable_auto_faq_rules" };
  }

  configCache.set(guildId, {
    loadedAt: Date.now(),
    config: autoFaqConfig,
  });

  return {
    ok: true as const,
    channelId: null,
    rules: publishableRules.length,
  };
}

export function registerAutoFaqMessageCreateEvent(
  client: Client,
  botConfig: BotConfig,
) {
  client.on(Events.MessageCreate, async (message) => {
    if (!message.guild || !message.guildId || message.author.bot) {
      return;
    }

    const config = await loadAutoFaqConfig(message.guildId, botConfig);

    if (!config?.enabled) return;

    const member =
      message.member ??
      (await message.guild.members.fetch(message.author.id).catch(() => null));

    for (const rule of config.rules) {
      if (
        !rule.enabled ||
        !ruleMatchesChannel(rule, message) ||
        memberHasIgnoredRole(member, rule.ignoredRoleIds) ||
        !ruleMatchesContent(rule, message.content ?? "") ||
        isOnCooldown(message.guildId, message.author.id, rule)
      ) {
        continue;
      }

      try {
        const sent = await sendAutoFaqReply(message, rule);

        logger.info(
          `[auto-faq] reply ${sent ? "sent" : "skipped"} | guildId=${message.guildId} | channelId=${message.channelId} | rule=${rule.id}`,
        );
      } catch (error) {
        logger.warn(
          `[auto-faq] reply failed | guildId=${message.guildId} | channelId=${message.channelId} | rule=${rule.id} | error=${error instanceof Error ? error.message : String(error)}`,
        );
      }

      return;
    }
  });

  logger.info("[auto-faq] messageCreate handler registered");
}
