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

async function reportAutoFaqEvent(
  botConfig: BotConfig,
  input: {
    guildId: string;
    faqRuleId: string;
    messageId?: string | null;
    channelId: string;
    userId?: string | null;
    eventType:
      | "FAQ_TRIGGERED"
      | "FAQ_DM_FAILED"
      | "FAQ_DELETE_FAILED"
      | "FAQ_COOLDOWN_BLOCKED"
      | "FAQ_REPLY_FAILED";
    success: boolean;
    shortMessage?: string | null;
  },
) {
  const syncClient = createDashboardSyncClient(botConfig);
  const result = await syncClient.reportAutoFaqEvent(input);

  if (!result.ok) {
    logger.warn(
      `[auto-faq] event report failed | guildId=${input.guildId} | rule=${input.faqRuleId} | event=${input.eventType} | reason=${result.message}`,
    );
  }
}

function readNumber(value: string, fallback: number) {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

function embedColor(value: string | undefined) {
  const colors: Record<string, number> = {
    "klarapps-teal": 0x14b8a6,
    blue: 0x3b82f6,
    purple: 0x8b5cf6,
    green: 0x22c55e,
    yellow: 0xeab308,
    red: 0xef4444,
    gray: 0x94a3b8,
  };

  return colors[value?.trim() ?? ""] ?? colors["klarapps-teal"];
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

function usesEmbed(rule: DashboardAutoFaqRuleConfig) {
  return rule.answerMode === "embed" || rule.answerMode === "embed_image";
}

function usesImage(rule: DashboardAutoFaqRuleConfig) {
  return rule.answerMode === "image" || rule.answerMode === "embed_image";
}

function buildEmbed(rule: DashboardAutoFaqRuleConfig) {
  const description = rule.embedDescription.trim() || rule.answerText.trim();
  const embed = new EmbedBuilder()
    .setColor(embedColor(rule.embedColor))
    .setTitle((rule.embedTitle.trim() || rule.name).slice(0, 256));

  if (description) {
    embed.setDescription(description.slice(0, 4096));
  }

  if (rule.embedFooter.trim()) {
    embed.setFooter({ text: rule.embedFooter.trim().slice(0, 2048) });
  }

  if (rule.embedThumbnailUrl.trim()) {
    embed.setThumbnail(rule.embedThumbnailUrl.trim());
  }

  if (rule.embedImageUrl.trim()) {
    embed.setImage(rule.embedImageUrl.trim());
  }

  return embed;
}

function attachmentUrl(rule: DashboardAutoFaqRuleConfig) {
  if (rule.answerMode === "image") {
    return rule.imageUrl.trim();
  }

  if (rule.answerMode === "embed_image" && !rule.embedImageUrl.trim()) {
    return rule.imageUrl.trim();
  }

  return "";
}

function hasSendableAnswer(rule: DashboardAutoFaqRuleConfig) {
  if (usesEmbed(rule)) {
    return Boolean(
      rule.embedTitle.trim() ||
        rule.embedDescription.trim() ||
        rule.answerText.trim() ||
        rule.embedImageUrl.trim() ||
        rule.imageUrl.trim(),
    );
  }

  if (rule.answerMode === "image") {
    return Boolean(rule.imageUrl.trim());
  }

  return Boolean(rule.answerText.trim());
}

async function scheduleBotReplyDelete(
  sentMessage: Message | null,
  rule: DashboardAutoFaqRuleConfig,
  botConfig: BotConfig,
  context: {
    guildId: string;
    channelId: string;
    userId: string;
  },
) {
  const delaySeconds = Math.max(
    0,
    readNumber(rule.deleteBotReplyAfterSeconds, 0),
  );

  if (!sentMessage || delaySeconds <= 0) return;

  setTimeout(() => {
    void sentMessage.delete().catch((error) => {
      logger.warn(
        `[auto-faq] bot reply delete failed | messageId=${sentMessage.id} | error=${error instanceof Error ? error.message : String(error)}`,
      );
      void reportAutoFaqEvent(botConfig, {
        guildId: context.guildId,
        faqRuleId: rule.id,
        messageId: sentMessage.id,
        channelId: context.channelId,
        userId: context.userId,
        eventType: "FAQ_DELETE_FAILED",
        success: false,
        shortMessage: error instanceof Error ? error.message : String(error),
      });
    });
  }, delaySeconds * 1000).unref?.();
}

async function deleteOriginalMessage(
  message: Message,
  rule: DashboardAutoFaqRuleConfig,
  botConfig: BotConfig,
) {
  if (!rule.deleteUserMessage) return;

  try {
    const botMember = await message.guild?.members.fetchMe().catch(() => null);

    if (!botMember?.permissionsIn(message.channelId).has(PermissionFlagsBits.ManageMessages)) {
      logger.warn(
        `[auto-faq] user message delete skipped | guildId=${message.guildId} | channelId=${message.channelId} | reason=missing_manage_messages`,
      );
      await reportAutoFaqEvent(botConfig, {
        guildId: message.guildId ?? "",
        faqRuleId: rule.id,
        messageId: message.id,
        channelId: message.channelId,
        userId: message.author.id,
        eventType: "FAQ_DELETE_FAILED",
        success: false,
        shortMessage: "missing_manage_messages",
      });
      return;
    }

    if (message.deletable) {
      await message.delete();
      logger.info(
        `[auto-faq] user message deleted | guildId=${message.guildId} | channelId=${message.channelId} | rule=${rule.id}`,
      );
    }
  } catch (error) {
    logger.warn(
      `[auto-faq] user message delete failed | guildId=${message.guildId} | channelId=${message.channelId} | rule=${rule.id} | error=${error instanceof Error ? error.message : String(error)}`,
    );
    await reportAutoFaqEvent(botConfig, {
      guildId: message.guildId ?? "",
      faqRuleId: rule.id,
      messageId: message.id,
      channelId: message.channelId,
      userId: message.author.id,
      eventType: "FAQ_DELETE_FAILED",
      success: false,
      shortMessage: error instanceof Error ? error.message : String(error),
    });
  }
}

async function sendAutoFaqReply(
  message: Message,
  rule: DashboardAutoFaqRuleConfig,
  botConfig: BotConfig,
) {
  if (!hasSendableAnswer(rule)) return null;

  const payload = {
    content:
      !usesEmbed(rule) && rule.answerMode !== "image"
        ? rule.answerText.slice(0, 2000)
        : undefined,
    embeds: usesEmbed(rule) ? [buildEmbed(rule)] : undefined,
    files: attachmentUrl(rule) ? [attachmentUrl(rule)] : undefined,
    allowedMentions: {
      repliedUser: false,
      parse: [],
    },
  };

  if (rule.dmResponse) {
    const dmMessage = await message.author.send(payload).catch((error) => {
      logger.warn(
        `[auto-faq] dm failed | guildId=${message.guildId} | userId=${message.author.id} | rule=${rule.id} | error=${error instanceof Error ? error.message : String(error)}`,
      );
      void reportAutoFaqEvent(botConfig, {
        guildId: message.guildId ?? "",
        faqRuleId: rule.id,
        messageId: message.id,
        channelId: message.channelId,
        userId: message.author.id,
        eventType: "FAQ_DM_FAILED",
        success: false,
        shortMessage: error instanceof Error ? error.message : String(error),
      });
      return null;
    });

    return dmMessage;
  }

  return message.reply(payload);
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
      hasSendableAnswer(rule),
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
      const matchesBase =
        rule.enabled &&
        ruleMatchesChannel(rule, message) &&
        !memberHasIgnoredRole(member, rule.ignoredRoleIds) &&
        ruleMatchesContent(rule, message.content ?? "");

      if (matchesBase && isOnCooldown(message.guildId, message.author.id, rule)) {
        await reportAutoFaqEvent(botConfig, {
          guildId: message.guildId,
          faqRuleId: rule.id,
          messageId: message.id,
          channelId: message.channelId,
          userId: message.author.id,
          eventType: "FAQ_COOLDOWN_BLOCKED",
          success: true,
          shortMessage: "cooldown",
        });
        return;
      }

      if (
        !matchesBase
      ) {
        continue;
      }

      try {
        const sentMessage = await sendAutoFaqReply(message, rule, botConfig);

        if (sentMessage) {
          await reportAutoFaqEvent(botConfig, {
            guildId: message.guildId,
            faqRuleId: rule.id,
            messageId: sentMessage.id,
            channelId: message.channelId,
            userId: message.author.id,
            eventType: "FAQ_TRIGGERED",
            success: true,
            shortMessage: rule.answerMode,
          });
        } else {
          await reportAutoFaqEvent(botConfig, {
            guildId: message.guildId,
            faqRuleId: rule.id,
            messageId: message.id,
            channelId: message.channelId,
            userId: message.author.id,
            eventType: "FAQ_REPLY_FAILED",
            success: false,
            shortMessage: "no_message_sent",
          });
        }

        await scheduleBotReplyDelete(sentMessage, rule, botConfig, {
          guildId: message.guildId,
          channelId: message.channelId,
          userId: message.author.id,
        });
        await deleteOriginalMessage(message, rule, botConfig);

        logger.info(
          `[auto-faq] reply ${sentMessage ? "sent" : "skipped"} | guildId=${message.guildId} | channelId=${message.channelId} | rule=${rule.id} | mode=${rule.answerMode} | dm=${rule.dmResponse ? "true" : "false"}`,
        );
      } catch (error) {
        logger.warn(
          `[auto-faq] reply failed | guildId=${message.guildId} | channelId=${message.channelId} | rule=${rule.id} | error=${error instanceof Error ? error.message : String(error)}`,
        );
        await reportAutoFaqEvent(botConfig, {
          guildId: message.guildId,
          faqRuleId: rule.id,
          messageId: message.id,
          channelId: message.channelId,
          userId: message.author.id,
          eventType: "FAQ_REPLY_FAILED",
          success: false,
          shortMessage: error instanceof Error ? error.message : String(error),
        });
      }

      return;
    }
  });

  logger.info("[auto-faq] messageCreate handler registered");
}
