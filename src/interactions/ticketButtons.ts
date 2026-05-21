import { ActionRowBuilder, type ButtonBuilder, type ButtonInteraction, ChannelType } from "discord.js";

import { ticketButtonIds, ticketTypes, type TicketType } from "../config/tickets.js";
import { dangerButton } from "../utils/components.js";
import { infoEmbed } from "../utils/embeds.js";
import {
  canManageTicket,
  createTicketChannel,
  findOpenTicketChannel,
} from "../utils/tickets.js";

export async function handleTicketButton(interaction: ButtonInteraction) {
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
      content: `Du hast bereits ein offenes Ticket: ${existingTicket}.`,
    });
    return;
  }

  const ticketChannel = await createTicketChannel(interaction.guild, member, definition);

  const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    dangerButton(ticketButtonIds.close, "🔒 Ticket schließen"),
  );

  await ticketChannel.send({
    embeds: [
      infoEmbed(
        [
          `**Tickettyp:** ${definition.label}`,
          `**Nutzer:** ${interaction.user}`,
          "",
          definition.description,
        ].join("\n"),
        "KlarBot Ticket",
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

  await interaction.reply("Ticket wird geschlossen...");
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
