import {
  ActionRowBuilder,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  PermissionsBitField,
  type ButtonBuilder,
  type ButtonInteraction,
  type GuildMember,
  type TextChannel,
} from "discord.js";

import type { BotConfig } from "../config/env.js";
import {
  ticketCloseConfirmButtonId,
  ticketCloseRequestButtonId,
  ticketPanelButtonId,
  ticketPanelButtonPrefix,
  ticketTopicPrefix,
} from "../features/tickets/ticketPanel.js";
import {
  createDashboardSyncClient,
  type DashboardTicketConfig,
  type DashboardTicketTypeConfig,
} from "../features/dashboardSync/dashboardSyncClient.js";
import { dangerButton, secondaryButton } from "../utils/components.js";
import { logger } from "../utils/logger.js";

type ActiveTicketConfigResult =
  | {
      ok: true;
      config: DashboardTicketConfig;
    }
  | {
      ok: false;
      reason: string;
      message: string;
    };

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
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

function ticketTopic(userId: string, ticketTypeId: string | null) {
  return ticketTypeId
    ? `${ticketTopicPrefix}:dashboard:${ticketTypeId}:${userId}`
    : `${ticketTopicPrefix}:dashboard:${userId}`;
}

function ticketSlug(value: string) {
  const normalized = (
    value || "ticket"
  )
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}-]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return normalized || "ticket";
}

function ticketChannelName(member: GuildMember, ticketType: DashboardTicketTypeConfig) {
  const username = ticketSlug(
    member.user.globalName ||
      member.displayName ||
      member.user.username ||
      member.id,
  );
  const prefix = ticketSlug(ticketType.name || ticketType.id);

  return `${prefix}-${username}`.slice(0, 90);
}

function resolveTicketType(
  ticketConfig: DashboardTicketConfig,
  ticketTypeId: string | null,
): DashboardTicketTypeConfig | null {
  if (ticketTypeId) {
    return (
      ticketConfig.ticketTypes.find((ticketType) => ticketType.id === ticketTypeId) ??
      null
    );
  }

  return (
    ticketConfig.ticketTypes[0] ?? {
      id: "legacy",
      name: ticketConfig.buttonLabel || "Ticket",
      description:
        ticketConfig.panelDescription ||
        "Bitte beschreibe dein Anliegen so klar wie moeglich.",
      emoji: "🎫",
      ticketCategoryId: ticketConfig.ticketCategoryId,
      supportRoleId: ticketConfig.supportRoleId,
      embedColor: ticketConfig.embedColor,
    }
  );
}

async function loadActiveTicketConfig(
  guildId: string,
  config: BotConfig,
): Promise<ActiveTicketConfigResult> {
  const syncClient = createDashboardSyncClient(config);
  const result = await syncClient.readTicketConfig(guildId);

  if (!result.ok) {
    logger.warn(
      `[tickets] config load failed | guildId=${guildId} | reason=${result.message}`,
    );
    return {
      ok: false,
      reason: result.status === 404 ? "config_not_found" : "sync_error",
      message: result.message,
    };
  }

  const ticketConfig = result.payload.ticketConfig;

  logger.info(
    `[tickets] Ticket Config geladen | guildId=${guildId} | enabled=${ticketConfig.enabled} | panelChannel=${ticketConfig.panelChannelId || "missing"} | ticketTypes=${ticketConfig.ticketTypes.length}`,
  );

  if (!ticketConfig.enabled) {
    return {
      ok: false,
      reason: "config_disabled",
      message: "Das Ticketsystem ist fuer diesen Server deaktiviert.",
    };
  }

  if (
    ticketConfig.ticketTypes.length === 0 ||
    ticketConfig.ticketTypes.some(
      (ticketType) => !ticketType.ticketCategoryId || !ticketType.supportRoleId,
    )
  ) {
    return {
      ok: false,
      reason: "config_incomplete",
      message: "Die Ticket-Konfiguration ist noch unvollstaendig.",
    };
  }

  return {
    ok: true,
    config: ticketConfig,
  };
}

export async function handleTicketButton(
  interaction: ButtonInteraction,
  config: BotConfig,
) {
  if (interaction.customId === ticketPanelButtonId) {
    await openTicket(interaction, config, null);
    return true;
  }

  if (interaction.customId.startsWith(ticketPanelButtonPrefix)) {
    await openTicket(
      interaction,
      config,
      interaction.customId.slice(ticketPanelButtonPrefix.length),
    );
    return true;
  }

  if (interaction.customId === ticketCloseRequestButtonId) {
    await requestTicketClose(interaction);
    return true;
  }

  if (interaction.customId === ticketCloseConfirmButtonId) {
    await confirmTicketClose(interaction);
    return true;
  }

  return false;
}

async function openTicket(
  interaction: ButtonInteraction,
  config: BotConfig,
  ticketTypeId: string | null,
) {
  if (!interaction.guild) {
    await interaction.reply({
      content: "Tickets koennen nur auf einem Discord-Server erstellt werden.",
      ephemeral: true,
    });
    return;
  }

  logger.info(
    `[tickets] Ticket create attempt | guildId=${interaction.guild.id} | userId=${interaction.user.id} | ticketType=${ticketTypeId || "legacy"}`,
  );

  await interaction.deferReply({ ephemeral: true });

  const configResult = await loadActiveTicketConfig(interaction.guild.id, config);

  if (!configResult.ok) {
    await interaction.editReply({
      content: configResult.message,
    });
    return;
  }

  try {
    const ticketConfig = configResult.config;
    const ticketType = resolveTicketType(ticketConfig, ticketTypeId);

    if (!ticketType) {
      await interaction.editReply({
        content: "Dieser Ticket-Typ wurde nicht gefunden. Bitte veroeffentliche das Panel neu.",
      });
      logger.warn(
        `[tickets] create failed | guildId=${interaction.guild.id} | reason=ticket_type_not_found | ticketType=${ticketTypeId || "legacy"}`,
      );
      return;
    }

    const botMember = await interaction.guild.members.fetchMe();

    if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.editReply({
        content: "KlarBot fehlt die Berechtigung, Channels zu verwalten.",
      });
      logger.warn(
        `[tickets] create failed | guildId=${interaction.guild.id} | reason=missing_manage_channels_permission`,
      );
      return;
    }

    const member = await interaction.guild.members.fetch(interaction.user.id);
    await interaction.guild.channels.fetch();
    const currentTicketTopic = ticketTopic(interaction.user.id, ticketType.id);
    const legacyTicketTopic = ticketTopic(interaction.user.id, null);
    const existing = interaction.guild.channels.cache.find(
      (channel): channel is TextChannel =>
        channel.type === ChannelType.GuildText &&
        (channel.topic === currentTicketTopic ||
          (!ticketTypeId && channel.topic === legacyTicketTopic)),
    );

    if (existing) {
      await interaction.editReply({
        content: `Du hast bereits ein offenes Ticket: ${existing}`,
      });
      return;
    }

    const category = await interaction.guild.channels
      .fetch(ticketType.ticketCategoryId)
      .catch(() => null);

    if (!category || category.type !== ChannelType.GuildCategory) {
      await interaction.editReply({
        content: "Die konfigurierte Ticket-Kategorie wurde nicht gefunden.",
      });
      logger.warn(
        `[tickets] create failed | guildId=${interaction.guild.id} | reason=category_not_found | ticketType=${ticketType.id} | categoryId=${ticketType.ticketCategoryId}`,
      );
      return;
    }

    const supportRole = await interaction.guild.roles
      .fetch(ticketType.supportRoleId)
      .catch(() => null);

    if (!supportRole) {
      await interaction.editReply({
        content: "Die konfigurierte Support-Rolle wurde nicht gefunden.",
      });
      logger.warn(
        `[tickets] create failed | guildId=${interaction.guild.id} | reason=support_role_not_found | ticketType=${ticketType.id} | roleId=${ticketType.supportRoleId}`,
      );
      return;
    }

    const ticketChannel = await interaction.guild.channels.create({
      name: ticketChannelName(member, ticketType),
      type: ChannelType.GuildText,
      parent: category.id,
      topic: currentTicketTopic,
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone.id,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.AttachFiles,
            PermissionsBitField.Flags.EmbedLinks,
          ],
        },
        {
          id: supportRole.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.ManageMessages,
          ],
        },
        {
          id: botMember.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.ManageChannels,
            PermissionsBitField.Flags.EmbedLinks,
          ],
        },
      ],
      reason: "KlarBot Dashboard Ticket erstellt",
    });

    logger.success(
      `[tickets] Ticket channel created | guildId=${interaction.guild.id} | channelId=${ticketChannel.id} | userId=${interaction.user.id} | ticketType=${ticketType.id}`,
    );

    const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      dangerButton(ticketCloseRequestButtonId, "Ticket schliessen"),
    );

    await ticketChannel.send({
      content: `${interaction.user} <@&${supportRole.id}>`,
      embeds: [
        new EmbedBuilder()
          .setColor(embedColor(ticketType.embedColor))
          .setTitle(`${ticketType.emoji ? `${ticketType.emoji} ` : ""}${ticketType.name}`)
          .setDescription(
            ticketType.description ||
              "Bitte beschreibe dein Anliegen so klar wie moeglich. Das Support-Team meldet sich hier.",
          ),
      ],
      components: [closeRow],
    });

    await interaction.editReply({
      content: `Dein Ticket wurde erstellt: ${ticketChannel}`,
    });
  } catch (error) {
    logger.error(
      `[tickets] create failed | guildId=${interaction.guild.id} | userId=${interaction.user.id} | reason=${errorMessage(error)}`,
      error,
    );
    await interaction.editReply({
      content: "KlarBot konnte dieses Ticket nicht erstellen. Bitte pruefe Bot-Rechte und Konfiguration.",
    });
  }
}

async function requestTicketClose(interaction: ButtonInteraction) {
  if (!interaction.guild || interaction.channel?.type !== ChannelType.GuildText) {
    await interaction.reply({
      content: "Dieses Ticket kann hier nicht geschlossen werden.",
      ephemeral: true,
    });
    return;
  }

  logger.info(
    `[tickets] Ticket close requested | guildId=${interaction.guild.id} | channelId=${interaction.channel.id} | userId=${interaction.user.id}`,
  );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    secondaryButton(ticketCloseConfirmButtonId, "Schliessen bestaetigen"),
  );

  await interaction.reply({
    content: "Moechtest du dieses Ticket wirklich schliessen? Der Channel wird geloescht.",
    components: [row],
    ephemeral: true,
  });
}

async function confirmTicketClose(interaction: ButtonInteraction) {
  if (!interaction.guild || interaction.channel?.type !== ChannelType.GuildText) {
    await interaction.reply({
      content: "Dieses Ticket kann hier nicht geschlossen werden.",
      ephemeral: true,
    });
    return;
  }

  const topic = interaction.channel.topic ?? "";

  if (!topic.startsWith(`${ticketTopicPrefix}:dashboard:`)) {
    await interaction.reply({
      content: "Dieser Channel ist kein KlarBot Ticket.",
      ephemeral: true,
    });
    return;
  }

  try {
    await interaction.reply({
      content: "Ticket wird geschlossen...",
      ephemeral: true,
    });

    const channelId = interaction.channel.id;
    const channelName = interaction.channel.name;
    await interaction.channel.delete("KlarBot Ticket geschlossen");
    logger.success(
      `[tickets] Ticket deleted | guildId=${interaction.guild.id} | channelId=${channelId} | name=${channelName} | closedBy=${interaction.user.id}`,
    );
  } catch (error) {
    logger.error(
      `[tickets] close failed | guildId=${interaction.guild.id} | channelId=${interaction.channel.id} | reason=${errorMessage(error)}`,
      error,
    );

    if (!interaction.replied) {
      await interaction.reply({
        content: "KlarBot konnte dieses Ticket nicht schliessen.",
        ephemeral: true,
      });
      return;
    }

    await interaction.followUp({
      content: "KlarBot konnte dieses Ticket nicht schliessen.",
      ephemeral: true,
    }).catch(() => undefined);
  }
}
