import { PermissionFlagsBits, type Client } from "discord.js";

import type { DashboardServerProfileConfig } from "../dashboardSync/dashboardSyncClient.js";
import { logger } from "../../utils/logger.js";

function normalizeNickname(value: string) {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed.slice(0, 32) : null;
}

export async function applyServerProfileForGuild(
  client: Client,
  guildId: string,
  serverProfileConfig: DashboardServerProfileConfig,
) {
  const nickname = normalizeNickname(serverProfileConfig.nickname);

  logger.info(
    `[server-profile] apply job received | guildId=${guildId} | nicknameSet=${nickname ? "true" : "false"}`,
  );

  const guild = await client.guilds.fetch(guildId).catch(() => null);

  if (!guild) {
    logger.warn(
      `[server-profile] apply failed | guildId=${guildId} | reason=guild_not_found`,
    );
    return {
      ok: false as const,
      reason: "guild_not_found",
    };
  }

  const member = await guild.members.fetchMe().catch(() => null);

  if (!member) {
    logger.warn(
      `[server-profile] apply failed | guildId=${guildId} | reason=bot_member_not_found`,
    );
    return {
      ok: false as const,
      reason: "bot_member_not_found",
    };
  }

  const permissions = member.permissions;

  if (!permissions.has(PermissionFlagsBits.ChangeNickname)) {
    logger.warn(
      `[server-profile] apply failed | guildId=${guildId} | reason=missing_change_nickname_permission`,
    );
    return {
      ok: false as const,
      reason: "missing_change_nickname_permission",
    };
  }

  try {
    await member.setNickname(
      nickname,
      "KlarApps Dashboard serverbezogenes Serverprofil",
    );

    logger.success(
      `[server-profile] nickname applied | guildId=${guildId} | nicknameSet=${nickname ? "true" : "false"}`,
    );

    return {
      ok: true as const,
      channelId: null,
      nickname,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    logger.warn(
      `[server-profile] apply failed | guildId=${guildId} | reason=${message}`,
    );

    return {
      ok: false as const,
      reason: message.includes("Missing Permissions")
        ? "missing_permissions"
        : "nickname_apply_failed",
    };
  }
}
