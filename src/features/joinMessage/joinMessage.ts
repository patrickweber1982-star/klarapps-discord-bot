import {
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  type Client,
  type GuildMember,
} from "discord.js";

import type { BotConfig } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import {
  createDashboardSyncClient,
  type DashboardJoinMessageConfig,
} from "../dashboardSync/dashboardSyncClient.js";

type ActiveJoinMessageConfigResult =
  | {
      ok: true;
      config: DashboardJoinMessageConfig;
    }
  | {
      ok: false;
      reason:
        | "config_not_found"
        | "config_disabled"
        | "missing_channel"
        | "missing_message"
        | "sync_error";
      message: string;
    };

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

  return colors[value?.trim() ?? ""] ?? colors["klarapps-teal"];
}

function imageUrl(value: string | undefined) {
  const trimmed = value?.trim() ?? "";

  if (!trimmed) {
    return "";
  }

  try {
    const url = new URL(trimmed);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return "";
    }

    return url.toString();
  } catch {
    return "";
  }
}

function applyPlaceholders(
  template: string,
  member: GuildMember,
  options: { pingUser: boolean },
) {
  const username =
    member.user.globalName?.trim() ||
    member.displayName?.trim() ||
    member.user.username;
  const withPlaceholders = template
    .replaceAll("{user}", member.toString())
    .replaceAll("{username}", username)
    .replaceAll("{server}", member.guild.name);

  if (options.pingUser && !template.includes("{user}")) {
    return `${member.toString()} ${withPlaceholders}`.trim();
  }

  return withPlaceholders;
}

async function getSendableTextChannel(
  client: Client,
  guildId: string,
  channelId: string,
) {
  const channel = await client.channels.fetch(channelId).catch(() => null);

  if (!channel || channel.type !== ChannelType.GuildText) {
    return {
      ok: false as const,
      reason: "channel_not_found",
      channelFound: false,
      canSend: false,
      canEmbedLinks: false,
      canAttachFiles: false,
    };
  }

  if (channel.guildId !== guildId) {
    return {
      ok: false as const,
      reason: "channel_not_found",
      channelFound: true,
      canSend: false,
      canEmbedLinks: false,
      canAttachFiles: false,
    };
  }

  const permissions = client.user ? channel.permissionsFor(client.user) : null;

  if (
    permissions &&
    !permissions.has([
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
    ])
  ) {
    return {
      ok: false as const,
      reason: "missing_permissions",
      channelFound: true,
      canSend: false,
      canEmbedLinks: permissions.has(PermissionFlagsBits.EmbedLinks),
      canAttachFiles: permissions.has(PermissionFlagsBits.AttachFiles),
    };
  }

  return {
    ok: true as const,
    channel,
    channelFound: true,
    canSend: true,
    canEmbedLinks: permissions
      ? permissions.has(PermissionFlagsBits.EmbedLinks)
      : false,
    canAttachFiles: permissions
      ? permissions.has(PermissionFlagsBits.AttachFiles)
      : false,
  };
}

export async function loadActiveJoinMessageConfig(
  guildId: string,
  config: BotConfig,
): Promise<ActiveJoinMessageConfigResult> {
  const syncClient = createDashboardSyncClient(config);
  const result = await syncClient.readJoinMessageConfig(guildId);

  if (!result.ok) {
    logger.warn(
      `Join Message Config konnte nicht geladen werden | guild=${guildId} | configFound=false | enabled=false | channelId=false | status=${result.status ?? "n/a"} | reason=${result.message}`,
    );

    return {
      ok: false,
      reason: result.status === 404 ? "config_not_found" : "sync_error",
      message: result.message,
    };
  }

  const joinMessageConfig = result.payload.joinMessageConfig;
  const channelAvailable = Boolean(joinMessageConfig.joinChannelId);

  logger.info(
    `Join Message Config geladen | guild=${guildId} | configFound=true | enabled=${joinMessageConfig.enabled} | status=${joinMessageConfig.status} | channelId=${channelAvailable ? joinMessageConfig.joinChannelId : "missing"} | imageUrl=${joinMessageConfig.imageUrl ? "true" : "false"} | embedEnabled=${joinMessageConfig.useEmbed ? "true" : "false"}`,
  );

  if (!joinMessageConfig.enabled) {
    return {
      ok: false,
      reason: "config_disabled",
      message: "Join Message ist fuer diese Guild deaktiviert.",
    };
  }

  if (!channelAvailable) {
    return {
      ok: false,
      reason: "missing_channel",
      message: "Join Message hat keinen Channel konfiguriert.",
    };
  }

  if (!joinMessageConfig.messageText.trim()) {
    return {
      ok: false,
      reason: "missing_message",
      message: "Join Message hat keinen Nachrichtentext konfiguriert.",
    };
  }

  return {
    ok: true,
    config: joinMessageConfig,
  };
}

export async function publishJoinMessageConfigForGuild(
  client: Client,
  guildId: string,
  joinMessageConfig: DashboardJoinMessageConfig,
) {
  const guild = await client.guilds.fetch(guildId).catch(() => null);

  if (!guild) {
    return {
      ok: false as const,
      reason: "guild_not_found",
    };
  }

  if (!joinMessageConfig.joinChannelId) {
    return {
      ok: false as const,
      reason: "no_channel_selected",
    };
  }

  if (!joinMessageConfig.messageText.trim()) {
    return {
      ok: false as const,
      reason: "missing_message",
    };
  }

  const channelResult = await getSendableTextChannel(
    client,
    guildId,
    joinMessageConfig.joinChannelId,
  );

  if (!channelResult.ok) {
    return channelResult;
  }

  logger.success(
    `Join Message veroeffentlicht | guild=${guildId} | channel=${joinMessageConfig.joinChannelId}`,
  );

  return {
    ok: true as const,
    channelId: joinMessageConfig.joinChannelId,
  };
}

export async function sendJoinMessageForMember(
  member: GuildMember,
  config: BotConfig,
) {
  logger.welcome(
    `Join Message Event empfangen | user=${member.user.tag} | guild=${member.guild.name}`,
  );

  const activeConfig = await loadActiveJoinMessageConfig(member.guild.id, config);

  if (!activeConfig.ok) {
    logger.info(
      `Join Message uebersprungen | guild=${member.guild.id} | member=${member.id} | sent=false | reason=${activeConfig.reason} | message=${activeConfig.message}`,
    );
    return;
  }

  const joinMessageConfig = activeConfig.config;

  const channelResult = await getSendableTextChannel(
    member.client,
    member.guild.id,
    joinMessageConfig.joinChannelId,
  );

  logger.info(
    `Join Message Channel pruefung | guild=${member.guild.id} | channelId=${joinMessageConfig.joinChannelId || "missing"} | channelFound=${channelResult.channelFound ? "true" : "false"} | canSend=${channelResult.canSend ? "true" : "false"} | canEmbedLinks=${channelResult.canEmbedLinks ? "true" : "false"} | canAttachFiles=${channelResult.canAttachFiles ? "true" : "false"}`,
  );

  if (!channelResult.ok) {
    logger.warn(
      `Join Message konnte nicht gesendet werden | guild=${member.guild.id} | member=${member.id} | channelId=${joinMessageConfig.joinChannelId || "missing"} | channelFound=${channelResult.channelFound ? "true" : "false"} | canSend=${channelResult.canSend ? "true" : "false"} | canEmbedLinks=${channelResult.canEmbedLinks ? "true" : "false"} | canAttachFiles=${channelResult.canAttachFiles ? "true" : "false"} | sent=false | reason=${channelResult.reason}`,
    );
    return;
  }

  const messageText = applyPlaceholders(
    joinMessageConfig.messageText,
    member,
    { pingUser: joinMessageConfig.pingUser },
  );
  const configuredImageUrl = imageUrl(joinMessageConfig.imageUrl);

  logger.info(
    `Join Message Send-Versuch | guild=${member.guild.id} | member=${member.id} | configFound=true | enabled=true | status=${joinMessageConfig.status} | channelId=${joinMessageConfig.joinChannelId} | imageUrl=${configuredImageUrl ? "true" : "false"} | embedEnabled=${joinMessageConfig.useEmbed ? "true" : "false"}`,
  );

  try {
    if (joinMessageConfig.useEmbed) {
      if (!channelResult.canEmbedLinks) {
        logger.warn(
          `Join Message Embed blockiert | guild=${member.guild.id} | member=${member.id} | channelId=${joinMessageConfig.joinChannelId} | sent=false | reason=missing_embed_links_permission`,
        );
        return;
      }

      const shouldPingInContent =
        joinMessageConfig.pingUser ||
        joinMessageConfig.messageText.includes("{user}");
      const embed = new EmbedBuilder()
        .setTitle(joinMessageConfig.embedTitle || "Willkommen")
        .setDescription(messageText)
        .setColor(embedColor(joinMessageConfig.embedColor))
        .setTimestamp();

      if (joinMessageConfig.embedFooter.trim()) {
        embed.setFooter({ text: joinMessageConfig.embedFooter });
      }

      if (configuredImageUrl) {
        embed.setImage(configuredImageUrl);
      }

      await channelResult.channel.send({
        content: shouldPingInContent ? member.toString() : undefined,
        embeds: [embed],
      });
    } else {
      await channelResult.channel.send({
        content: configuredImageUrl
          ? `${messageText}\n${configuredImageUrl}`.trim()
          : messageText,
      });
    }

    logger.welcome(
      `Join Message gesendet | guild=${member.guild.id} | member=${member.id} | channelId=${joinMessageConfig.joinChannelId} | imageUrl=${configuredImageUrl ? "true" : "false"} | embedEnabled=${joinMessageConfig.useEmbed ? "true" : "false"} | sent=true`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(
      `Join Message Versand fehlgeschlagen | guild=${member.guild.id} | member=${member.id} | channelId=${joinMessageConfig.joinChannelId} | imageUrl=${configuredImageUrl ? "true" : "false"} | embedEnabled=${joinMessageConfig.useEmbed ? "true" : "false"} | sent=false | error=${message}`,
      error,
    );
  }
}
