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
  const userValue = options.pingUser
    ? member.toString()
    : member.displayName || member.user.username;

  return template
    .replaceAll("{user}", userValue)
    .replaceAll("{username}", member.user.username)
    .replaceAll("{server}", member.guild.name);
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
    };
  }

  if (channel.guildId !== guildId) {
    return {
      ok: false as const,
      reason: "channel_not_found",
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
    };
  }

  return {
    ok: true as const,
    channel,
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
  const syncClient = createDashboardSyncClient(config);
  const result = await syncClient.readJoinMessageConfig(member.guild.id);

  if (!result.ok) {
    logger.debug(
      `Join Message uebersprungen | guild=${member.guild.id} | reason=${result.message}`,
    );
    return;
  }

  const joinMessageConfig = result.payload.joinMessageConfig;

  if (!joinMessageConfig.enabled) {
    logger.debug(
      `Join Message deaktiviert | guild=${member.guild.id}`,
    );
    return;
  }

  const channelResult = await getSendableTextChannel(
    member.client,
    member.guild.id,
    joinMessageConfig.joinChannelId,
  );

  if (!channelResult.ok) {
    logger.warn(
      `Join Message konnte nicht gesendet werden | guild=${member.guild.id} | reason=${channelResult.reason}`,
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
        joinMessageConfig.pingUser &&
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
