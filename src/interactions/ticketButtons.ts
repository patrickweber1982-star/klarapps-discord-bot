import { ActionRowBuilder, type ButtonBuilder, type ButtonInteraction, ChannelType } from "discord.js";

import { ticketButtonIds, ticketTypes, type TicketType } from "../config/tickets.js";
import {
  logTicketClosedEvent,
  logTicketCreatedEvent,
  logTicketErrorEvent,
} from "../features/tickets/ticketLogService.js";
import { buildTicketTranscript } from "../features/tickets/transcripts/transcriptBuilder.js";
import { uploadTicketTranscript } from "../features/tickets/transcripts/transcriptUploader.js";
import { dangerButton, secondaryButton } from "../utils/components.js";
import { infoEmbed, successEmbed } from "../utils/embeds.js";
import {
  canManageTicket,
  createTicketChannel,
  findOpenTicketChannel,
} from "../utils/tickets.js";
import { logger } from "../utils/logger.js";

export async function handleTicketButton(interaction: ButtonInteraction) {
  if (interaction.customId === ticketButtonIds.claim) {
    await interaction.reply({
      content: "Feature folgt bald.",
      ephemeral: true,
    });
    return true;
  }

  if (interaction.customId === ticketButtonIds.close) {
    await closeTicket(interaction);
    return true;
  }

  const ticketType = getTicketTypeFromButton(interaction.customId);

  if (!ticketType) {
    return false;
  }

  await openTicket(interaction, ticketType);
  return true;
}

async function openTicket(interaction: ButtonInteraction, ticketType: TicketType) {
  if (!interaction.guild) {
    await interaction.reply({
      content: "Tickets koennen nur auf einem Discord-Server erstellt werden.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const definition = ticketTypes[ticketType];
    const member = await interaction.guild.members.fetch(interaction.user.id);
    await interaction.guild.channels.fetch();

    const existingTicket = findOpenTicketChannel(interaction.guild, ticketType, interaction.user.id);

    if (existingTicket) {
      await interaction.editReply({
        content: `Du hast bereits ein offenes ${definition.label}-Ticket: ${existingTicket}. Bitte nutze zuerst dieses Ticket weiter.`,
      });
      return;
    }

    const ticketChannel = await createTicketChannel(interaction.guild, member, definition);
    logger.success(`Ticket erstellt: ${ticketChannel.name} (${definition.type}) fuer ${interaction.user.tag}`);

    const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      secondaryButton(ticketButtonIds.claim, "📌 Claim"),
      dangerButton(ticketButtonIds.close, "🔒 Schließen"),
    );

    await ticketChannel.send({
      embeds: [
        infoEmbed(
          [
            `**Tickettyp:** ${definition.label}`,
            `**Nutzer:** ${interaction.user}`,
            "",
            definition.description,
            "",
            "Bitte bleibe respektvoll und beschreibe dein Anliegen so klar wie moeglich.",
          ].join("\n"),
          `🎫 ${definition.label}`,
        ),
      ],
      components: [closeRow],
    });

    await logTicketCreatedEvent({
      guild: interaction.guild,
      user: interaction.user,
      ticketChannel,
      ticketType: definition.label,
    });

    await interaction.editReply({
      content: `Dein Ticket wurde erstellt: ${ticketChannel}`,
    });
  } catch (error) {
    await logTicketErrorEvent({
      guild: interaction.guild,
      action: "Ticket erstellen",
      errorReason: getErrorMessage(error),
      user: interaction.user,
      channel: interaction.channel,
    });

    await interaction.editReply({
      content: "KlarBot konnte dieses Ticket nicht erstellen. Bitte informiere das Team.",
    });
  }
}

async function closeTicket(interaction: ButtonInteraction) {
  if (!interaction.guild || interaction.channel?.type !== ChannelType.GuildText) {
    await interaction.reply({
      content: "Dieses Ticket kann hier nicht geschlossen werden.",
      ephemeral: true,
    });
    return;
  }

  try {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const topic = interaction.channel.topic ?? "";
    const openerId = topic.split(":")[2];

    if (openerId !== interaction.user.id && !canManageTicket(member)) {
      await interaction.reply({
        content: "Du darfst dieses Ticket nicht schließen.",
        ephemeral: true,
      });
      return;
    }

    const channelName = interaction.channel.name;
    const openerUser = openerId
      ? await interaction.client.users.fetch(openerId).catch(() => null)
      : null;

    await interaction.reply({
      embeds: [successEmbed("Ticket wird geschlossen...")],
    });

    try {
      const transcript = await buildTicketTranscript({
        channel: interaction.channel,
        guildName: interaction.guild.name,
        createdBy: openerUser?.tag ?? (openerId ? `User ${openerId}` : "Unbekannt"),
        closedBy: interaction.user.tag,
      });

      await uploadTicketTranscript({
        guild: interaction.guild,
        transcript,
        ticketUser: openerUser,
        closedBy: interaction.user,
      });
    } catch (transcriptError) {
      await logTicketErrorEvent({
        guild: interaction.guild,
        action: "Transcript erstellen",
        errorReason: getErrorMessage(transcriptError),
        user: openerUser,
        channel: interaction.channel,
      });
    }

    await logTicketClosedEvent({
      guild: interaction.guild,
      user: openerUser,
      closedBy: interaction.user,
      ticketChannelName: channelName,
      reason: "Ticket geschlossen",
    });

    logger.success(`Ticket geschlossen: ${channelName} von ${interaction.user.tag}`);
    await wait(5000);
    await interaction.channel.delete("KlarBot Ticket geschlossen");
  } catch (error) {
    await logTicketErrorEvent({
      guild: interaction.guild,
      action: "Ticket schließen",
      errorReason: getErrorMessage(error),
      user: interaction.user,
      channel: interaction.channel,
    });

    if (!interaction.replied) {
      await interaction.reply({
        content: "KlarBot konnte dieses Ticket nicht schließen. Bitte informiere das Team.",
        ephemeral: true,
      });
    }
  }
}

function getTicketTypeFromButton(customId: string): TicketType | null {
  const match = Object.entries(ticketButtonIds).find(([, buttonId]) => buttonId === customId);

  if (!match || match[0] === "close") {
    return null;
  }

  return match[0] as TicketType;
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unbekannter Fehler";
}
