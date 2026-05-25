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
    };
  }

  if (channel.guildId !== guildId) {
    return {
      ok: false as const,
      reason: "channel_not_found",
      channelFound: true,
      canSend: false,
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
    };
  }

  return {
    ok: true as const,
    channel,
    channelFound: true,
    canSend: true,
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
    `Join Message Config geladen | guild=${guildId} | configFound=true | enabled=${joinMessageConfig.enabled} | status=${joinMessageConfig.status} | channelId=${channelAvailable ? "true" : "false"}`,
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
      `Join Message uebersprungen | guild=${member.guild.id} | reason=${activeConfig.reason} | message=${activeConfig.message}`,
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
    `Join Message Channel pruefung | guild=${member.guild.id} | channelId=${joinMessageConfig.joinChannelId || "missing"} | channelFound=${channelResult.channelFound ? "true" : "false"} | canSend=${channelResult.canSend ? "true" : "false"}`,
  );

  if (!channelResult.ok) {
    logger.warn(
      `Join Message konnte nicht gesendet werden | guild=${member.guild.id} | channelId=${joinMessageConfig.joinChannelId || "missing"} | channelFound=${channelResult.channelFound ? "true" : "false"} | canSend=${channelResult.canSend ? "true" : "false"} | reason=${channelResult.reason}`,
    );
    return;
  }

  const messageText = applyPlaceholders(
    joinMessageConfig.messageText,
    member,
    { pingUser: joinMessageConfig.pingUser },
  );

  try {
    if (joinMessageConfig.useEmbed) {
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

      await channelResult.channel.send({
        content: shouldPingInContent ? member.toString() : undefined,
        embeds: [embed],
      });
    } else {
      await channelResult.channel.send({
        content: messageText,
      });
    }

    logger.welcome(
      `Join Message gesendet | user=${member.user.tag} | guild=${member.guild.name}`,
    );
  } catch (error) {
    logger.warn(
      `Join Message Versand fehlgeschlagen | guild=${member.guild.id}`,
      error,
    );
  }
}
