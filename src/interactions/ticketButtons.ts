import { ActionRowBuilder, type ButtonBuilder, type ButtonInteraction, ChannelType } from "discord.js";

import { ticketButtonIds, ticketTypes, type TicketType } from "../config/tickets.js";
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

  await interaction.editReply({
    content: `Dein Ticket wurde erstellt: ${ticketChannel}`,
  });
}

async function closeTicket(interaction: ButtonInteraction) {
  if (!interaction.guild || interaction.channel?.type !== ChannelType.GuildText) {
    await interaction.reply({
      content: "Dieses Ticket kann hier nicht geschlossen werden.",
      ephemeral: true,
    });
    return;
  }

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

  await interaction.reply({
    embeds: [successEmbed("Ticket wird geschlossen...")],
  });

  logger.success(`Ticket geschlossen: ${interaction.channel.name} von ${interaction.user.tag}`);
  await wait(5000);
  await interaction.channel.delete("KlarBot Ticket geschlossen");
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
