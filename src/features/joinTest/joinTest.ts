import {
  ChannelType,
  PermissionFlagsBits,
  type Client,
  type GuildMember,
} from "discord.js";

import type { BotConfig } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import {
  createDashboardSyncClient,
  type DashboardJoinTestConfig,
} from "../dashboardSync/dashboardSyncClient.js";

type ActiveJoinTestConfigResult =
  | {
      ok: true;
      config: DashboardJoinTestConfig;
    }
  | {
      ok: false;
      configFound: boolean;
      enabled: boolean;
      channelId: string;
      reason: string;
    };

function applyPlaceholders(template: string, member: GuildMember) {
  const username =
    member.displayName?.trim() ||
    member.user.globalName?.trim() ||
    member.user.username;

  return template
    .replaceAll("{user}", `<@${member.id}>`)
    .replaceAll("{username}", username)
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
      channelFound: false,
      canSend: false,
      reason: "channel_not_found",
    };
  }

  if (channel.guildId !== guildId) {
    return {
      ok: false as const,
      channelFound: true,
      canSend: false,
      reason: "channel_guild_mismatch",
    };
  }

  const permissions = client.user ? channel.permissionsFor(client.user) : null;
  const canSend = permissions
    ? permissions.has([
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
      ])
    : false;

  if (!canSend) {
    return {
      ok: false as const,
      channelFound: true,
      canSend: false,
      reason: "missing_permissions",
    };
  }

  return {
    ok: true as const,
    channelFound: true,
    canSend: true,
    channel,
  };
}

export async function loadActiveJoinTestConfig(
  guildId: string,
  config: BotConfig,
): Promise<ActiveJoinTestConfigResult> {
  const syncClient = createDashboardSyncClient(config);
  const result = await syncClient.readJoinTestConfig(guildId);

  if (!result.ok) {
    logger.warn(
      `[join-test] config lookup failed | guildId=${guildId} | configFound=false | enabled=false | channelId= | error=${result.message}`,
    );

    return {
      ok: false,
      configFound: false,
      enabled: false,
      channelId: "",
      reason: result.message,
    };
  }

  const joinTestConfig = result.payload.joinTestConfig;
  const channelId = joinTestConfig.channelId || "";

  logger.info(
    `[join-test] config loaded | guildId=${guildId} | configFound=true | enabled=${joinTestConfig.enabled ? "true" : "false"} | channelId=${channelId || "missing"}`,
  );

  if (!joinTestConfig.enabled) {
    return {
      ok: false,
      configFound: true,
      enabled: false,
      channelId,
      reason: "disabled",
    };
  }

  if (!channelId) {
    return {
      ok: false,
      configFound: true,
      enabled: true,
      channelId,
      reason: "missing_channel",
    };
  }

  if (!joinTestConfig.message.trim()) {
    return {
      ok: false,
      configFound: true,
      enabled: true,
      channelId,
      reason: "missing_message",
    };
  }

  return {
    ok: true,
    config: joinTestConfig,
  };
}

export async function sendJoinTestMessageForMember(
  member: GuildMember,
  config: BotConfig,
) {
  logger.info(
    `[join-test] guildMemberAdd received | guildId=${member.guild.id} | memberId=${member.id}`,
  );

  const activeConfig = await loadActiveJoinTestConfig(member.guild.id, config);

  if (!activeConfig.ok) {
    logger.info(
      `[join-test] skipped | guildId=${member.guild.id} | memberId=${member.id} | configFound=${activeConfig.configFound ? "true" : "false"} | enabled=${activeConfig.enabled ? "true" : "false"} | channelId=${activeConfig.channelId || "missing"} | channelFound=false | canSend=false | sent=false | error=${activeConfig.reason}`,
    );
    return;
  }

  const channelResult = await getSendableTextChannel(
    member.client,
    member.guild.id,
    activeConfig.config.channelId,
  );

  logger.info(
    `[join-test] channel check | guildId=${member.guild.id} | memberId=${member.id} | configFound=true | enabled=true | channelId=${activeConfig.config.channelId} | channelFound=${channelResult.channelFound ? "true" : "false"} | canSend=${channelResult.canSend ? "true" : "false"}`,
  );

  if (!channelResult.ok) {
    logger.warn(
      `[join-test] send skipped | guildId=${member.guild.id} | memberId=${member.id} | configFound=true | enabled=true | channelId=${activeConfig.config.channelId} | channelFound=${channelResult.channelFound ? "true" : "false"} | canSend=${channelResult.canSend ? "true" : "false"} | sent=false | error=${channelResult.reason}`,
    );
    return;
  }

  try {
    await channelResult.channel.send({
      content: applyPlaceholders(activeConfig.config.message, member),
    });

    logger.info(
      `[join-test] sent | guildId=${member.guild.id} | memberId=${member.id} | configFound=true | enabled=true | channelId=${activeConfig.config.channelId} | channelFound=true | canSend=true | sent=true`,
    );
  } catch (error) {
    logger.error(
      `[join-test] send failed | guildId=${member.guild.id} | memberId=${member.id} | configFound=true | enabled=true | channelId=${activeConfig.config.channelId} | channelFound=true | canSend=true | sent=false`,
      error,
    );
  }
}
