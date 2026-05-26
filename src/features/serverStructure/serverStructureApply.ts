import {
  ChannelType,
  PermissionFlagsBits,
  type Client,
  type GuildBasedChannel,
} from "discord.js";

import type { DashboardServerStructureConfig } from "../dashboardSync/dashboardSyncClient.js";
import { logger } from "../../utils/logger.js";

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 100);
}

function normalizeTextChannelName(value: string) {
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
    const categoryName = normalizeName(categoryConfig.name);

    if (!categoryName) {
      continue;
    }

    let category = channels.find(
      (channel) =>
        isCategory(channel) &&
        channel?.name.toLowerCase() === categoryName.toLowerCase(),
    );

    if (!category) {
      category = await guild.channels.create({
        name: categoryName,
        type: ChannelType.GuildCategory,
        reason: "KlarApps Dashboard Server Struktur",
      });
      channels.set(category.id, category);
      createdCategories += 1;
      logger.info(
        `[server-structure] category created | guildId=${guildId} | name=${categoryName}`,
      );
    }

    for (const channelConfig of categoryConfig.channels) {
      const channelName =
        channelConfig.type === "text"
          ? normalizeTextChannelName(channelConfig.name)
          : normalizeName(channelConfig.name);

      if (!channelName || !category) {
        continue;
      }

      const existing = channels.find((channel) =>
        isMatchingChannel(channel, {
          name: channelName,
          type: channelConfig.type,
          parentId: category.id,
        }),
      );

      if (existing) {
        skippedChannels += 1;
        logger.info(
          `[server-structure] channel exists | guildId=${guildId} | category=${categoryName} | name=${channelName} | type=${channelConfig.type}`,
        );
        continue;
      }

      const created = await guild.channels.create({
        name: channelName,
        type: channelTypeFor(channelConfig.type),
        parent: category.id,
        reason: "KlarApps Dashboard Server Struktur",
      });

      channels.set(created.id, created);
      createdChannels += 1;
      logger.info(
        `[server-structure] channel created | guildId=${guildId} | category=${categoryName} | name=${channelName} | type=${channelConfig.type}`,
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
