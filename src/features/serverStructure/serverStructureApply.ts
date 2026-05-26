import {
  ChannelType,
  PermissionFlagsBits,
  type Client,
  type GuildBasedChannel,
} from "discord.js";

import type { DashboardServerStructureConfig } from "../dashboardSync/dashboardSyncClient.js";
import { logger } from "../../utils/logger.js";

function normalizeName(value: string) {
  return value.trim().slice(0, 100);
}

function fallbackTextChannelName(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);

  return normalized || "neuer-channel";
}

function fallbackGenericName(value: string, fallback: string) {
  const normalized = value
    .trim()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);

  return normalized || fallback;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function channelTypeFor(input: "text" | "voice") {
  return input === "voice" ? ChannelType.GuildVoice : ChannelType.GuildText;
}

function isCategory(channel: GuildBasedChannel | null | undefined) {
  return channel?.type === ChannelType.GuildCategory;
}

function isMatchingChannel(
  channel: GuildBasedChannel | null | undefined,
  input: {
    name: string;
    type: "text" | "voice";
    parentId: string;
  },
) {
  if (!channel) {
    return false;
  }

  return (
    channel.name.toLowerCase() === input.name.toLowerCase() &&
    channel.type === channelTypeFor(input.type) &&
    "parentId" in channel &&
    channel.parentId === input.parentId
  );
}

export async function applyServerStructureForGuild(
  client: Client,
  guildId: string,
  serverStructureConfig: DashboardServerStructureConfig,
) {
  logger.info(
    `[server-structure] apply job received | guildId=${guildId} | categories=${serverStructureConfig.categories.length}`,
  );

  const guild = await client.guilds.fetch(guildId).catch(() => null);

  if (!guild) {
    logger.warn(
      `[server-structure] apply failed | guildId=${guildId} | reason=guild_not_found`,
    );
    return {
      ok: false as const,
      reason: "guild_not_found",
    };
  }

  const member = await guild.members.fetchMe().catch(() => null);

  if (!member) {
    logger.warn(
      `[server-structure] apply failed | guildId=${guildId} | reason=bot_member_not_found`,
    );
    return {
      ok: false as const,
      reason: "bot_member_not_found",
    };
  }

  if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
    logger.warn(
      `[server-structure] apply failed | guildId=${guildId} | reason=missing_manage_channels_permission`,
    );
    return {
      ok: false as const,
      reason: "missing_manage_channels_permission",
    };
  }

  const channels = await guild.channels.fetch();
  let createdCategories = 0;
  let createdChannels = 0;
  let skippedChannels = 0;

  for (const categoryConfig of serverStructureConfig.categories) {
    const requestedCategoryName = normalizeName(categoryConfig.name);

    if (!requestedCategoryName) {
      continue;
    }

    let category = channels.find(
      (channel) =>
        isCategory(channel) &&
        channel?.name.toLowerCase() === requestedCategoryName.toLowerCase(),
    );

    if (!category) {
      category = await guild.channels
        .create({
          name: requestedCategoryName,
          type: ChannelType.GuildCategory,
          reason: "KlarApps Dashboard Server Struktur",
        })
        .catch(async (error) => {
          const fallbackName = fallbackGenericName(
            requestedCategoryName,
            "Kategorie",
          );

          logger.warn(
            `[server-structure] category original name rejected | guildId=${guildId} | requestedName=${requestedCategoryName} | fallbackName=${fallbackName} | reason=${errorMessage(error)}`,
          );

          if (fallbackName === requestedCategoryName) {
            throw error;
          }

          return guild.channels.create({
            name: fallbackName,
            type: ChannelType.GuildCategory,
            reason: "KlarApps Dashboard Server Struktur Fallback",
          });
        });
      channels.set(category.id, category);
      createdCategories += 1;
      logger.info(
        `[server-structure] category created | guildId=${guildId} | requestedName=${requestedCategoryName} | createdName=${category.name}`,
      );
    }

    for (const channelConfig of categoryConfig.channels) {
      const requestedChannelName = normalizeName(channelConfig.name);

      if (!requestedChannelName || !category) {
        continue;
      }

      const existing = channels.find((channel) =>
        isMatchingChannel(channel, {
          name: requestedChannelName,
          type: channelConfig.type,
          parentId: category.id,
        }),
      );

      if (existing) {
        skippedChannels += 1;
        logger.info(
          `[server-structure] channel exists | guildId=${guildId} | categoryRequestedName=${requestedCategoryName} | categoryCreatedName=${category.name} | requestedName=${requestedChannelName} | existingName=${existing.name} | type=${channelConfig.type}`,
        );
        continue;
      }

      const created = await guild.channels
        .create({
          name: requestedChannelName,
          type: channelTypeFor(channelConfig.type),
          parent: category.id,
          reason: "KlarApps Dashboard Server Struktur",
        })
        .catch(async (error) => {
          const fallbackName =
            channelConfig.type === "text"
              ? fallbackTextChannelName(requestedChannelName)
              : fallbackGenericName(requestedChannelName, "Neuer Channel");

          logger.warn(
            `[server-structure] channel original name rejected | guildId=${guildId} | categoryCreatedName=${category.name} | requestedName=${requestedChannelName} | fallbackName=${fallbackName} | type=${channelConfig.type} | reason=${errorMessage(error)}`,
          );

          if (fallbackName === requestedChannelName) {
            throw error;
          }

          return guild.channels.create({
            name: fallbackName,
            type: channelTypeFor(channelConfig.type),
            parent: category.id,
            reason: "KlarApps Dashboard Server Struktur Fallback",
          });
        });

      channels.set(created.id, created);
      createdChannels += 1;
      logger.info(
        `[server-structure] channel created | guildId=${guildId} | categoryRequestedName=${requestedCategoryName} | categoryCreatedName=${category.name} | requestedName=${requestedChannelName} | createdName=${created.name} | type=${channelConfig.type}`,
      );
    }
  }

  logger.success(
    `[server-structure] apply success | guildId=${guildId} | createdCategories=${createdCategories} | createdChannels=${createdChannels} | skippedChannels=${skippedChannels}`,
  );

  return {
    ok: true as const,
    channelId: null,
    createdCategories,
    createdChannels,
    skippedChannels,
  };
}

export async function deleteServerStructureForGuild(
  client: Client,
  guildId: string,
) {
  logger.warn(`[server-structure] delete job received | guildId=${guildId}`);

  const guild = await client.guilds.fetch(guildId).catch(() => null);

  if (!guild) {
    logger.warn(
      `[server-structure] delete failed | guildId=${guildId} | reason=guild_not_found`,
    );
    return {
      ok: false as const,
      reason: "guild_not_found",
    };
  }

  const member = await guild.members.fetchMe().catch(() => null);

  if (!member) {
    logger.warn(
      `[server-structure] delete failed | guildId=${guildId} | reason=bot_member_not_found`,
    );
    return {
      ok: false as const,
      reason: "bot_member_not_found",
    };
  }

  if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
    logger.warn(
      `[server-structure] delete failed | guildId=${guildId} | reason=missing_manage_channels_permission`,
    );
    return {
      ok: false as const,
      reason: "missing_manage_channels_permission",
    };
  }

  const channels = await guild.channels.fetch();
  const deletableChannels = [...channels.values()]
    .filter((channel) => channel !== null)
    .sort(
      (a, b) =>
        (a.type === ChannelType.GuildCategory ? 1 : 0) -
        (b.type === ChannelType.GuildCategory ? 1 : 0),
    );
  let deletedChannels = 0;
  let failedChannels = 0;

  for (const channel of deletableChannels) {
    try {
      logger.warn(
        `[server-structure] deleting channel | guildId=${guildId} | channelId=${channel.id} | name=${channel.name} | type=${channel.type}`,
      );
      await channel.delete("KlarApps Dashboard bestehende Serverstruktur loeschen");
      deletedChannels += 1;
    } catch (error) {
      failedChannels += 1;
      logger.warn(
        `[server-structure] channel delete failed | guildId=${guildId} | channelId=${channel.id} | reason=${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  if (failedChannels > 0) {
    return {
      ok: false as const,
      reason: `channels_delete_partial_failed:${failedChannels}`,
    };
  }

  logger.success(
    `[server-structure] delete success | guildId=${guildId} | deletedChannels=${deletedChannels}`,
  );

  return {
    ok: true as const,
    channelId: null,
    deletedChannels,
  };
}
