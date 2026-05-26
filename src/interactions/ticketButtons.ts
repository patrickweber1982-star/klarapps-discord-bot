import {
  ActionRowBuilder,
  AttachmentBuilder,
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
  ticketClaimButtonId,
  ticketPanelButtonId,
  ticketPanelButtonPrefix,
  ticketTopicPrefix,
} from "../features/tickets/ticketPanel.js";
import {
  createDashboardSyncClient,
  type DashboardTicketConfig,
  type DashboardTicketTypeConfig,
} from "../features/dashboardSync/dashboardSyncClient.js";
import { buildTicketTranscript } from "../features/tickets/transcripts/transcriptBuilder.js";
import { dangerButton, primaryButton, secondaryButton } from "../utils/components.js";
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
      autoReply: "",
    }
  );
}

function parseTicketTopic(topic: string) {
  if (!topic.startsWith(`${ticketTopicPrefix}:dashboard:`)) {
    return null;
  }

  const parts = topic.split(":");

  if (parts.length >= 4) {
    return {
      ticketTypeId: parts[2] || null,
      userId: parts[3] || null,
    };
  }

  return {
    ticketTypeId: null,
    userId: parts[2] || null,
  };
}

async function findConfiguredLogChannel(
  ticketConfig: DashboardTicketConfig,
  guildId: string,
  interaction: ButtonInteraction,
) {
  if (!ticketConfig.logChannelId) {
    logger.warn(`[tickets] logChannelFound=false | guildId=${guildId} | reason=not_configured`);
    return null;
  }

  const channel = await interaction.client.channels
    .fetch(ticketConfig.logChannelId)
    .catch(() => null);

  if (!channel || channel.type !== ChannelType.GuildText || channel.guildId !== guildId) {
    logger.warn(
      `[tickets] logChannelFound=false | guildId=${guildId} | channelId=${ticketConfig.logChannelId || "missing"}`,
    );
    return null;
  }

  const botMember = interaction.guild
    ? await interaction.guild.members.fetchMe().catch(() => null)
    : null;
  const permissions = botMember ? channel.permissionsFor(botMember) : null;

  if (
    !permissions?.has(PermissionFlagsBits.ViewChannel) ||
    !permissions.has(PermissionFlagsBits.SendMessages) ||
    !permissions.has(PermissionFlagsBits.EmbedLinks)
  ) {
    logger.warn(
      `[tickets] logChannelFound=false | guildId=${guildId} | channelId=${channel.id} | reason=missing_permissions`,
    );
    return null;
  }

  logger.info(`[tickets] logChannelFound=true | guildId=${guildId} | channelId=${channel.id}`);
  return channel;
}

async function sendTicketLog(input: {
  interaction: ButtonInteraction;
  ticketConfig: DashboardTicketConfig;
  embed: EmbedBuilder;
  attachment?: AttachmentBuilder;
}) {
  if (!input.interaction.guild) {
    return false;
  }

  const logChannel = await findConfiguredLogChannel(
    input.ticketConfig,
    input.interaction.guild.id,
    input.interaction,
  );

  if (!logChannel) {
    return false;
  }

  const botMember = await input.interaction.guild.members.fetchMe().catch(() => null);
  const permissions = botMember ? logChannel.permissionsFor(botMember) : null;

  if (input.attachment && !permissions?.has(PermissionFlagsBits.AttachFiles)) {
    logger.warn(
      `[tickets] ticket log failed | guildId=${input.interaction.guild.id} | channelId=${logChannel.id} | reason=missing_attach_files`,
    );
    return false;
  }

  await logChannel
    .send({
      embeds: [input.embed],
      files: input.attachment ? [input.attachment] : [],
    })
    .then(() => {
      logger.info(
        `[tickets] ticket log sent | guildId=${input.interaction.guild?.id} | channelId=${logChannel.id}`,
      );
    })
    .catch((error) => {
      logger.warn(
        `[tickets] ticket log failed | guildId=${input.interaction.guild?.id} | reason=${errorMessage(error)}`,
        error,
      );
    });

  return true;
}

async function reportTicketEvent(
  config: BotConfig,
  input: Parameters<ReturnType<typeof createDashboardSyncClient>["reportTicketEvent"]>[0],
) {
  const result = await createDashboardSyncClient(config).reportTicketEvent(input);

  if (!result.ok) {
    logger.warn(
      `[tickets] dashboard event report failed | guildId=${input.guildId} | channelId=${input.channelId} | status=${input.status} | reason=${result.message}`,
    );
    return;
  }

  logger.info(
    `[tickets] dashboard event reported | guildId=${input.guildId} | channelId=${input.channelId} | status=${input.status}`,
  );
}

function buildTicketCreatedLogEmbed(input: {
  ticketChannel: TextChannel;
  ticketType: DashboardTicketTypeConfig;
  creatorId: string;
}) {
  return new EmbedBuilder()
    .setColor(embedColor(input.ticketType.embedColor))
    .setTitle("Ticket erstellt")
    .setDescription(
      [
        `**Ticket-Typ:** ${input.ticketType.emoji ? `${input.ticketType.emoji} ` : ""}${input.ticketType.name}`,
        `**Ersteller:** <@${input.creatorId}>`,
        `**Channel:** ${input.ticketChannel}`,
        `**Zeit:** <t:${Math.floor(Date.now() / 1000)}:F>`,
      ].join("\n"),
    )
    .setTimestamp();
}

function buildTicketClosedLogEmbed(input: {
  ticketChannelName: string;
  ticketType: DashboardTicketTypeConfig | null;
  openerId: string | null;
  closedById: string;
  mode: "delete" | "archive";
  transcriptMessageCount: number;
}) {
  return new EmbedBuilder()
    .setColor(input.mode === "archive" ? 0x3b82f6 : 0x14b8a6)
    .setTitle(input.mode === "archive" ? "Ticket archiviert" : "Ticket geschlossen")
    .setDescription(
      [
        input.ticketType
          ? `**Ticket-Typ:** ${input.ticketType.emoji ? `${input.ticketType.emoji} ` : ""}${input.ticketType.name}`
          : "**Ticket-Typ:** Unbekannt",
        `**Ersteller:** ${input.openerId ? `<@${input.openerId}>` : "Unbekannt"}`,
        `**Geschlossen von:** <@${input.closedById}>`,
        `**Channel:** #${input.ticketChannelName}`,
        `**Modus:** ${input.mode === "archive" ? "Archiviert" : "Geloescht"}`,
        `**Transkript-Nachrichten:** ${input.transcriptMessageCount}`,
        `**Zeit:** <t:${Math.floor(Date.now() / 1000)}:F>`,
      ].join("\n"),
    )
    .setTimestamp();
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

  if (interaction.customId === ticketClaimButtonId) {
    await claimTicket(interaction, config);
    return true;
  }

  if (interaction.customId === ticketCloseConfirmButtonId) {
    await confirmTicketClose(interaction, config);
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

    await reportTicketEvent(config, {
      guildId: interaction.guild.id,
      channelId: ticketChannel.id,
      channelName: ticketChannel.name,
      ticketTypeId: ticketType.id,
      ticketTypeName: ticketType.name,
      creatorId: interaction.user.id,
      creatorName: interaction.user.tag,
      status: "OPEN",
      openedAt: new Date().toISOString(),
    });

    const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      primaryButton(ticketClaimButtonId, "Ticket uebernehmen"),
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

    if (ticketType.autoReply.trim()) {
      await ticketChannel.send({
        content: ticketType.autoReply.trim(),
      });
    }

    await sendTicketLog({
      interaction,
      ticketConfig,
      embed: buildTicketCreatedLogEmbed({
        ticketChannel,
        ticketType,
        creatorId: interaction.user.id,
      }),
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

async function claimTicket(interaction: ButtonInteraction, config: BotConfig) {
  if (!interaction.guild || interaction.channel?.type !== ChannelType.GuildText) {
    await interaction.reply({
      content: "Dieses Ticket kann hier nicht uebernommen werden.",
      ephemeral: true,
    });
    return;
  }

  const ticketMeta = parseTicketTopic(interaction.channel.topic ?? "");

  if (!ticketMeta) {
    await interaction.reply({
      content: "Dieser Channel ist kein KlarBot Ticket.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const configResult = await loadActiveTicketConfig(interaction.guild.id, config);

  if (!configResult.ok) {
    await interaction.editReply({ content: configResult.message });
    return;
  }

  const ticketType = resolveTicketType(configResult.config, ticketMeta.ticketTypeId);

  if (!ticketType) {
    await interaction.editReply({
      content: "Dieser Ticket-Typ wurde nicht gefunden.",
    });
    return;
  }

  const member = await interaction.guild.members
    .fetch(interaction.user.id)
    .catch(() => null);
  const canClaim =
    member?.permissions.has(PermissionFlagsBits.ManageChannels) ||
    member?.roles.cache.has(ticketType.supportRoleId);

  if (!canClaim) {
    await interaction.editReply({
      content: "Nur die konfigurierte Support-Rolle kann dieses Ticket uebernehmen.",
    });
    return;
  }

  await reportTicketEvent(config, {
    guildId: interaction.guild.id,
    channelId: interaction.channel.id,
    channelName: interaction.channel.name,
    ticketTypeId: ticketMeta.ticketTypeId,
    ticketTypeName: ticketType.name,
    creatorId: ticketMeta.userId ?? interaction.user.id,
    status: "OPEN",
    claimedAt: new Date().toISOString(),
    claimedById: interaction.user.id,
    claimedByName: interaction.user.tag,
  });

  await interaction.channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0x14b8a6)
        .setTitle("Ticket uebernommen")
        .setDescription(`Bearbeitet von ${interaction.user}.`)
        .setTimestamp(),
    ],
  });

  logger.info(
    `[tickets] ticket claimed | guildId=${interaction.guild.id} | channelId=${interaction.channel.id} | claimedBy=${interaction.user.id}`,
  );

  await interaction.editReply({
    content: "Du hast dieses Ticket uebernommen.",
  });
}

async function confirmTicketClose(interaction: ButtonInteraction, config: BotConfig) {
  if (!interaction.guild || interaction.channel?.type !== ChannelType.GuildText) {
    await interaction.reply({
      content: "Dieses Ticket kann hier nicht geschlossen werden.",
      ephemeral: true,
    });
    return;
  }

  const topic = interaction.channel.topic ?? "";
  const ticketMeta = parseTicketTopic(topic);

  if (!ticketMeta) {
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

    const configResult = await loadActiveTicketConfig(interaction.guild.id, config);
    const ticketConfig = configResult.ok ? configResult.config : null;
    const ticketType = ticketConfig
      ? resolveTicketType(ticketConfig, ticketMeta.ticketTypeId)
      : null;
    const closeMode = ticketConfig?.closeMode === "archive" ? "archive" : "delete";
    const channel = interaction.channel;
    const channelId = channel.id;
    const channelName = channel.name;
    const openerUser = ticketMeta.userId
      ? await interaction.client.users.fetch(ticketMeta.userId).catch(() => null)
      : null;

    logger.info(
      `[tickets] transcriptStarted | guildId=${interaction.guild.id} | channelId=${channelId} | ticketType=${ticketMeta.ticketTypeId || "legacy"}`,
    );

    const transcript = await buildTicketTranscript({
      channel,
      guildName: interaction.guild.name,
      createdBy: openerUser?.tag ?? ticketMeta.userId ?? "Unbekannt",
      closedBy: interaction.user.tag,
    });

    logger.info(
      `[tickets] transcriptMessageCount=${transcript.messageCount} | guildId=${interaction.guild.id} | channelId=${channelId}`,
    );
    logger.info(
      `[tickets] transcriptCreated | guildId=${interaction.guild.id} | channelId=${channelId} | file=${transcript.fileName}`,
    );

    if (ticketConfig) {
      const attachment = new AttachmentBuilder(
        Buffer.from(transcript.content, "utf8"),
        { name: transcript.fileName },
      );

      await sendTicketLog({
        interaction,
        ticketConfig,
        embed: buildTicketClosedLogEmbed({
          ticketChannelName: channelName,
          ticketType,
          openerId: ticketMeta.userId,
          closedById: interaction.user.id,
          mode: closeMode,
          transcriptMessageCount: transcript.messageCount,
        }),
        attachment,
      });
    } else {
      logger.warn(
        `[tickets] close log skipped | guildId=${interaction.guild.id} | reason=config_unavailable`,
      );
    }

    if (closeMode === "archive") {
      logger.info(
        `[tickets] archiveMode | guildId=${interaction.guild.id} | channelId=${channelId} | archiveCategory=${ticketConfig?.archiveCategoryId || "none"}`,
      );

      if (!ticketConfig || !ticketType) {
        logger.warn(
          `[tickets] archive missing config | guildId=${interaction.guild.id} | channelId=${channelId}`,
        );
      }

      const botMember = await interaction.guild.members.fetchMe().catch(() => null);

      if (!botMember?.permissions.has(PermissionFlagsBits.ManageChannels)) {
        throw new Error("missing_manage_channels_permission");
      }

      if (ticketMeta.userId) {
        await channel.permissionOverwrites
          .edit(ticketMeta.userId, {
            ViewChannel: false,
            SendMessages: false,
          })
          .catch((error) => {
            logger.warn(
              `[tickets] archive user overwrite failed | guildId=${interaction.guild?.id} | channelId=${channelId} | reason=${errorMessage(error)}`,
              error,
            );
          });
      }

      if (ticketConfig?.archiveCategoryId) {
        const archiveCategory = await interaction.guild.channels
          .fetch(ticketConfig.archiveCategoryId)
          .catch(() => null);

        if (archiveCategory?.type === ChannelType.GuildCategory) {
          await channel.setParent(archiveCategory.id, {
            lockPermissions: false,
            reason: "KlarBot Ticket archiviert",
          });
        } else {
          logger.warn(
            `[tickets] archive category not found | guildId=${interaction.guild.id} | categoryId=${ticketConfig.archiveCategoryId}`,
          );
        }
      }

      const archivedName = `closed-${channelName}`.slice(0, 100);
      await channel.setName(archivedName, "KlarBot Ticket archiviert");
      await reportTicketEvent(config, {
        guildId: interaction.guild.id,
        channelId,
        channelName: archivedName,
        ticketTypeId: ticketMeta.ticketTypeId,
        ticketTypeName: ticketType?.name ?? null,
        creatorId: ticketMeta.userId ?? interaction.user.id,
        creatorName: openerUser?.tag ?? null,
        status: "ARCHIVED",
        closedAt: new Date().toISOString(),
        archivedAt: new Date().toISOString(),
        closedById: interaction.user.id,
        closedByName: interaction.user.tag,
        transcriptFileName: transcript.fileName,
      });
      logger.success(
        `[tickets] closeSuccess | guildId=${interaction.guild.id} | channelId=${channelId} | mode=archive`,
      );
      await interaction.followUp({
        content: "Ticket wurde archiviert.",
        ephemeral: true,
      }).catch(() => undefined);
      return;
    }

    logger.info(`[tickets] deleteMode | guildId=${interaction.guild.id} | channelId=${channelId}`);
    await reportTicketEvent(config, {
      guildId: interaction.guild.id,
      channelId,
      channelName,
      ticketTypeId: ticketMeta.ticketTypeId,
      ticketTypeName: ticketType?.name ?? null,
      creatorId: ticketMeta.userId ?? interaction.user.id,
      creatorName: openerUser?.tag ?? null,
      status: "CLOSED",
      closedAt: new Date().toISOString(),
      closedById: interaction.user.id,
      closedByName: interaction.user.tag,
      transcriptFileName: transcript.fileName,
    });
    await channel.delete("KlarBot Ticket geschlossen");
    logger.success(
      `[tickets] closeSuccess | guildId=${interaction.guild.id} | channelId=${channelId} | name=${channelName} | closedBy=${interaction.user.id} | mode=delete`,
    );
  } catch (error) {
    logger.error(
      `[tickets] closeFailure | guildId=${interaction.guild.id} | channelId=${interaction.channel.id} | reason=${errorMessage(error)}`,
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
