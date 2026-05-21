import { ActionRowBuilder, SlashCommandBuilder, type ButtonBuilder } from "discord.js";

import { creatorButtonIds } from "../config/creator.js";
import type { BotCommand } from "../types/command.js";
import { dangerButton, primaryButton, secondaryButton } from "../utils/components.js";
import { creatorEmbed, errorEmbed } from "../utils/embeds.js";
import { canModerate, moderationPermissionMessage } from "../utils/permissions.js";

export const creatorPanelCommand: BotCommand = {
  name: "creator-panel",
  data: new SlashCommandBuilder()
    .setName("creator-panel")
    .setDescription("Erstellt ein Creator-Panel."),
  async execute({ interaction }) {
    if (!interaction.guild) {
      await interaction.reply({
        embeds: [errorEmbed("Dieser Command kann nur auf einem Discord-Server genutzt werden.")],
        ephemeral: true,
      });
      return;
    }

    if (!(await canModerate(interaction))) {
      await interaction.reply({
        embeds: [errorEmbed(moderationPermissionMessage())],
        ephemeral: true,
      });
      return;
    }

    const embed = creatorEmbed(
      [
        "KlarBot hilft beim Verwalten deiner Community und Content-Ankündigungen.",
        "",
        "Nutze die Buttons, um schnell professionelle Creator-Updates im Channel zu posten.",
      ].join("\n"),
      "🎬 Creator Tools",
    );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      dangerButton(creatorButtonIds.stream, "🔴 Stream ankündigen"),
      primaryButton(creatorButtonIds.video, "📹 Neues Video"),
      secondaryButton(creatorButtonIds.giveaway, "🎁 Giveaway"),
      secondaryButton(creatorButtonIds.update, "📢 Community Update"),
    );

    await interaction.reply({
      embeds: [embed],
      components: [row],
    });
  },
};
