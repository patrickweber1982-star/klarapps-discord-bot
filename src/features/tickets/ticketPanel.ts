import {
  ActionRowBuilder,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  type ButtonBuilder,
  type Client,
} from "discord.js";

import type { DashboardTicketConfig } from "../dashboardSync/dashboardSyncClient.js";
import { primaryButton } from "../../utils/components.js";
import { logger } from "../../utils/logger.js";

export const ticketPanelButtonId = "ticket:open";
export const ticketPanelButtonPrefix = "ticket:open:";
export const ticketCloseRequestButtonId = "ticket:close:request";
export const ticketCloseConfirmButtonId = "ticket:close:confirm";
export const ticketClaimButtonId = "ticket:claim";
export const ticketTopicPrefix = "klarbot-ticket";

export function ticketPanelButtonIdForType(ticketTypeId: string) {
  return `${ticketPanelButtonPrefix}${ticketTypeId}`;
}

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

function buildTicketPanelEmbed(ticketConfig: DashboardTicketConfig) {
  const ticketTypeLines = ticketConfig.ticketTypes
    .map((ticketType) => {
      const emoji = ticketType.emoji?.trim();
      const description = ticketType.description?.trim();

      return `${emoji ? `${emoji} ` : ""}**${ticketType.name.trim()}**${
        description ? `\n${description}` : ""
      }`;
    })
    .join("\n\n");

  return new EmbedBuilder()
    .setColor(embedColor(ticketConfig.embedColor))
    .setTitle(ticketConfig.panelTitle.trim())
    .setDescription(
      [ticketConfig.panelDescription.trim(), ticketTypeLines]
        .filter(Boolean)
        .join("\n\n"),
    );
}

function buildTicketPanelRows(ticketConfig: DashboardTicketConfig) {
  const buttons = ticketConfig.ticketTypes.slice(0, 25).map((ticketType) => {
    const label = `${ticketType.emoji ? `${ticketType.emoji} ` : ""}${
      ticketType.name.trim() || ticketConfig.buttonLabel.trim() || "Ticket"
    }`.slice(0, 80);

    return primaryButton(ticketPanelButtonIdForType(ticketType.id), label);
  });
  const rows: Array<ActionRowBuilder<ButtonBuilder>> = [];

  for (let index = 0; index < buttons.length; index += 5) {
    rows.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        buttons.slice(index, index + 5),
      ),
    );
  }

  if (rows.length > 0) {
    return rows;
  }

  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      primaryButton(
        ticketPanelButtonId,
        ticketConfig.buttonLabel.trim() || "Ticket erstellen",
      ),
    ),
  ];
}

export async function publishTicketPanelForGuild(
  client: Client,
  guildId: string,
  ticketConfig: DashboardTicketConfig,
  existingMessageId: string | null,
) {
  logger.info(
    `[tickets] publish job received | guildId=${guildId} | panelChannel=${ticketConfig.panelChannelId || "none"} | ticketTypes=${ticketConfig.ticketTypes.length}`,
  );

  const guild = await client.guilds.fetch(guildId).catch(() => null);

  if (!guild) {
    logger.warn(`[tickets] publish failed | guildId=${guildId} | reason=guild_not_found`);
    return { ok: false as const, reason: "guild_not_found" };
  }

  const member = await guild.members.fetchMe().catch(() => null);

  if (!member?.permissions.has(PermissionFlagsBits.ManageChannels)) {
    logger.warn(`[tickets] publish failed | guildId=${guildId} | reason=missing_manage_channels_permission`);
    return { ok: false as const, reason: "missing_manage_channels_permission" };
  }

  const panelChannel = await client.channels
    .fetch(ticketConfig.panelChannelId)
    .catch(() => null);

  if (!panelChannel || panelChannel.type !== ChannelType.GuildText) {
    logger.warn(`[tickets] publish failed | guildId=${guildId} | reason=panel_channel_not_found`);
    return { ok: false as const, reason: "panel_channel_not_found" };
  }

  if (panelChannel.guildId !== guildId) {
    logger.warn(`[tickets] publish failed | guildId=${guildId} | reason=panel_channel_wrong_guild`);
    return { ok: false as const, reason: "panel_channel_not_found" };
  }

  const panelPermissions = client.user
    ? panelChannel.permissionsFor(client.user)
    : null;

  if (
    panelPermissions &&
    !panelPermissions.has([
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.EmbedLinks,
    ])
  ) {
    logger.warn(`[tickets] publish failed | guildId=${guildId} | reason=panel_channel_missing_permissions`);
    return { ok: false as const, reason: "panel_channel_missing_permissions" };
  }

  for (const ticketType of ticketConfig.ticketTypes) {
    const category = await guild.channels
      .fetch(ticketType.ticketCategoryId)
      .catch(() => null);

    if (!category || category.type !== ChannelType.GuildCategory) {
      logger.warn(
        `[tickets] publish failed | guildId=${guildId} | reason=ticket_category_not_found | ticketType=${ticketType.id} | categoryId=${ticketType.ticketCategoryId}`,
      );
      return { ok: false as const, reason: "ticket_category_not_found" };
    }

    const supportRole = await guild.roles
      .fetch(ticketType.supportRoleId)
      .catch(() => null);

    if (!supportRole) {
      logger.warn(
        `[tickets] publish failed | guildId=${guildId} | reason=support_role_not_found | ticketType=${ticketType.id} | roleId=${ticketType.supportRoleId}`,
      );
      return { ok: false as const, reason: "support_role_not_found" };
    }
  }

  const messagePayload = {
    embeds: [buildTicketPanelEmbed(ticketConfig)],
    components: buildTicketPanelRows(ticketConfig),
  };
  let message = existingMessageId
    ? await panelChannel.messages.fetch(existingMessageId).catch(() => null)
    : null;

  if (message) {
    message = await message.edit(messagePayload);
    logger.success(`[tickets] panel updated | guildId=${guildId} | channelId=${panelChannel.id} | messageId=${message.id}`);
  } else {
    message = await panelChannel.send(messagePayload);
    logger.success(`[tickets] panel published | guildId=${guildId} | channelId=${panelChannel.id} | messageId=${message.id}`);
  }

  return {
    ok: true as const,
    channelId: panelChannel.id,
    messageId: message.id,
  };
}
