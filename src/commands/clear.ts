import { SlashCommandBuilder } from "discord.js";

import type { BotCommand } from "../types/command.js";
import { errorEmbed, successEmbed } from "../utils/embeds.js";
import { logModerationAction } from "../utils/moderationLogs.js";
import { canUseModeration, moderationPermissionMessage } from "../utils/permissions.js";

export const clearCommand: BotCommand = {
  name: "clear",
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Löscht Nachrichten.")
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Anzahl der Nachrichten, die geloescht werden sollen.")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true),
    ),
  async execute({ interaction }) {
    if (!interaction.guild) {
      await interaction.reply({ embeds: [errorEmbed("Dieser Command funktioniert nur auf einem Server.")], ephemeral: true });
      return;
    }

    if (!(await canUseModeration(interaction))) {
      await interaction.reply({ embeds: [errorEmbed(moderationPermissionMessage())], ephemeral: true });
      return;
    }

    const amount = interaction.options.getInteger("amount", true);
    const channel = interaction.channel;

    if (!channel || !("bulkDelete" in channel)) {
      await interaction.reply({ embeds: [errorEmbed("In diesem Channel koennen keine Nachrichten geloescht werden.")], ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    const deletedMessages = await channel.bulkDelete(amount, true);

    await interaction.editReply({
      embeds: [successEmbed(`${deletedMessages.size} Nachrichten wurden geloescht.`, "Nachrichten geloescht")],
    });

    await logModerationAction({
      guild: interaction.guild,
      action: "/clear",
      moderator: interaction.user,
      details: `${deletedMessages.size} Nachrichten in #${channel.name} geloescht.`,
    });
  },
};
