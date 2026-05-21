import { ActionRowBuilder, SlashCommandBuilder, type ButtonBuilder } from "discord.js";

import type { BotCommand } from "../types/command.js";
import { primaryButton, secondaryButton } from "../utils/components.js";
import { infoEmbed } from "../utils/embeds.js";
import { helpButtonIds } from "../interactions/helpButtons.js";

export const helpCommand: BotCommand = {
  name: "help",
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Zeigt die KlarBot Hilfe und verfügbaren Funktionen."),
  async execute({ interaction }) {
    const embed = infoEmbed(
      [
        "KlarBot verbindet die wichtigsten Discord-Funktionen fuer KlarApps und dient als zentrale Steuerung fuer kommende Systeme.",
        "",
        "**Verfuegbare Commands**",
        "`/klarbot` - prueft den Bot-Status.",
        "`/setup` - erstellt die KlarApps Discord-Grundstruktur.",
        "`/help` - zeigt diese Hilfe und das KlarBot Menue.",
        "`/verify` - erstellt ein Verify-Panel fuer neue Mitglieder.",
        "`/tickets` - erstellt ein Support-Ticket-Panel.",
      ].join("\n"),
      "KlarBot Hilfe",
    );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      primaryButton(helpButtonIds.overview, "Übersicht"),
      secondaryButton(helpButtonIds.setup, "Setup"),
      secondaryButton(helpButtonIds.support, "Support"),
      secondaryButton(helpButtonIds.roles, "Rollen"),
    );

    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true,
    });
  },
};
