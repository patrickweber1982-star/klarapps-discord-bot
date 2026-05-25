import {
  EmbedBuilder,
  PermissionFlagsBits,
  type Client,
} from "discord.js";

import type {
  DashboardInfoBlockConfig,
  DashboardInfoConfig,
} from "../dashboardSync/dashboardSyncClient.js";
import { logger } from "../../utils/logger.js";

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

function isHttpImageUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

function sortedBlocks(blocks: DashboardInfoBlockConfig[]) {
  return [...blocks].sort((a, b) => a.sortOrder - b.sortOrder);
}

function buildEmbedBlock(block: DashboardInfoBlockConfig) {
  const embed = new EmbedBuilder().setColor(embedColor(block.color));
  const title = block.title.trim();
  const description = block.description.trim();
  const footer = block.footer.trim();

  if (title) {
    embed.setTitle(title);
  }

  if (description) {
    embed.setDescription(description);
  }

  if (footer) {
    embed.setFooter({ text: footer });
  }

  return embed;
}

function buildImageBlock(block: DashboardInfoBlockConfig) {
  return new EmbedBuilder()
    .setColor(embedColor(block.color))
    .setImage(block.imageUrl.trim());
}

export async function publishInfoConfigForGuild(
  client: Client,
  guildId: string,
  infoConfig: DashboardInfoConfig,
) {
  logger.info(
    `[info] publish job received | guildId=${guildId} | configFound=true | channelId=${infoConfig.channelId || "none"} | blockCount=${infoConfig.blocks.length}`,
  );

  const guild = await client.guilds.fetch(guildId).catch(() => null);

  if (!guild) {
    logger.warn(`[info] publish failed | guildId=${guildId} | reason=guild_not_found`);
    return {
      ok: false as const,
      reason: "guild_not_found",
    };
  }

  if (!infoConfig.channelId) {
    logger.warn(`[info] publish failed | guildId=${guildId} | reason=no_channel_selected`);
    return {
      ok: false as const,
      reason: "no_channel_selected",
    };
  }

  const channel = await client.channels.fetch(infoConfig.channelId).catch(() => null);

  if (!channel || !("send" in channel) || typeof channel.send !== "function") {
    logger.warn(`[info] publish failed | guildId=${guildId} | reason=channel_not_found`);
    return {
      ok: false as const,
      reason: "channel_not_found",
    };
  }

  if ("guildId" in channel && channel.guildId !== guildId) {
    logger.warn(`[info] publish failed | guildId=${guildId} | reason=channel_wrong_guild`);
    return {
      ok: false as const,
      reason: "channel_not_found",
    };
  }

  const permissions =
    "permissionsFor" in channel && client.user
      ? channel.permissionsFor(client.user)
      : null;

  if (
    permissions &&
    !permissions.has([
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
    ])
  ) {
    logger.warn(`[info] publish failed | guildId=${guildId} | reason=missing_permissions`);
    return {
      ok: false as const,
      reason: "missing_permissions",
    };
  }

  let sentBlocks = 0;

  for (const [index, block] of sortedBlocks(infoConfig.blocks).entries()) {
    logger.info(
      `[info] sending block ${index + 1} type=${block.type} | guildId=${guildId}`,
    );

    if (block.type === "image") {
      if (!block.imageUrl.trim()) {
        logger.warn(
          `[info] block skipped | guildId=${guildId} | index=${index + 1} | reason=missing_image_url`,
        );
        continue;
      }

      if (!isHttpImageUrl(block.imageUrl)) {
        logger.warn(
          `[info] block skipped | guildId=${guildId} | index=${index + 1} | reason=invalid_image_url`,
        );
        continue;
      }

      await channel.send({
        embeds: [buildImageBlock(block)],
      });
      sentBlocks += 1;
      continue;
    }

    if (!block.title.trim() && !block.description.trim()) {
      logger.warn(
        `[info] block skipped | guildId=${guildId} | index=${index + 1} | reason=empty_embed`,
      );
      continue;
    }

    await channel.send({
      embeds: [buildEmbedBlock(block)],
    });
    sentBlocks += 1;
  }

  if (sentBlocks === 0) {
    logger.warn(`[info] publish failed | guildId=${guildId} | reason=no_publishable_blocks`);
    return {
      ok: false as const,
      reason: "no_publishable_blocks",
    };
  }

  logger.success(
    `[info] publish success | guildId=${guildId} | channelId=${infoConfig.channelId} | sentBlocks=${sentBlocks}`,
  );

  return {
    ok: true as const,
    channelId: infoConfig.channelId,
    sentBlocks,
  };
}
