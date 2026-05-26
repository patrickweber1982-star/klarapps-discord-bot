import { PermissionFlagsBits, type Client } from "discord.js";

import type { DashboardServerProfileConfig } from "../dashboardSync/dashboardSyncClient.js";
import { logger } from "../../utils/logger.js";

const serverProfileImageMaxBytes = 10 * 1024 * 1024;

function normalizeNickname(value: string) {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed.slice(0, 32) : null;
}

function normalizeImageUrl(value: string | undefined) {
  const trimmed = value?.trim() ?? "";

  return trimmed.length > 0 ? trimmed : null;
}

async function imageUrlToDataUri(
  url: string,
  kind: "avatar" | "banner",
  guildId: string,
) {
  const parsedUrl = new URL(url);

  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    throw new Error(`${kind}_invalid_url`);
  }

  const response = await fetch(url).catch((error) => {
    throw new Error(
      `${kind}_fetch_failed:${error instanceof Error ? error.message : String(error)}`,
    );
  });

  if (!response.ok) {
    throw new Error(`${kind}_fetch_failed:http_${response.status}`);
  }

  const contentType = response.headers.get("content-type")?.split(";")[0] ?? "";

  if (!["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"].includes(contentType)) {
    throw new Error(`${kind}_invalid_content_type`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  if (buffer.length > serverProfileImageMaxBytes) {
    throw new Error(`${kind}_too_large`);
  }

  logger.info(
    `[server-profile] ${kind} image loaded | guildId=${guildId} | bytes=${buffer.length} | type=${contentType}`,
  );

  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

export async function applyServerProfileForGuild(
  client: Client,
  guildId: string,
  serverProfileConfig: DashboardServerProfileConfig,
) {
  const nickname = normalizeNickname(serverProfileConfig.nickname);
  const avatarImageUrl = normalizeImageUrl(serverProfileConfig.avatarImageUrl);
  const bannerImageUrl = normalizeImageUrl(serverProfileConfig.bannerImageUrl);

  logger.info(
    `[server-profile] apply job received | guildId=${guildId} | nicknameSet=${nickname ? "true" : "false"} | avatarSet=${avatarImageUrl ? "true" : "false"} | bannerSet=${bannerImageUrl ? "true" : "false"}`,
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
    const [avatar, banner] = await Promise.all([
      avatarImageUrl
        ? imageUrlToDataUri(avatarImageUrl, "avatar", guildId)
        : Promise.resolve(null),
      bannerImageUrl
        ? imageUrlToDataUri(bannerImageUrl, "banner", guildId)
        : Promise.resolve(null),
    ]);

    await client.rest.patch(`/guilds/${guildId}/members/@me`, {
      body: {
        nick: nickname,
        avatar,
        banner,
      },
      reason: "KlarApps Dashboard serverbezogenes Serverprofil",
    });

    logger.success(
      `[server-profile] profile applied | guildId=${guildId} | nicknameSet=${nickname ? "true" : "false"} | avatarSet=${avatar ? "true" : "false"} | bannerSet=${banner ? "true" : "false"}`,
    );

    return {
      ok: true as const,
      channelId: null,
      nickname,
      avatarApplied: Boolean(avatar),
      bannerApplied: Boolean(banner),
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
