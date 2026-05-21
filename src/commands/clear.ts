import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

import type { BotCommand } from "../types/command.js";
import { errorEmbed, punishmentEmbed, warningEmbed } from "../utils/embeds.js";
import { logModerationAction } from "../utils/moderationLogs.js";
import { canModerate, moderationPermissionMessage } from "../utils/permissions.js";

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

    if (!(await canModerate(interaction))) {
      await interaction.reply({ embeds: [errorEmbed(moderationPermissionMessage())], ephemeral: true });
      return;
    }

    const amount = interaction.options.getInteger("amount", true);
    const channel = interaction.channel;

    if (amount < 1 || amount > 100) {
      await interaction.reply({ embeds: [warningEmbed("Bitte wähle eine Zahl zwischen 1 und 100.")], ephemeral: true });
      return;
    }

    if (!channel || !("bulkDelete" in channel)) {
      await interaction.reply({ embeds: [errorEmbed("In diesem Channel koennen keine Nachrichten geloescht werden.")], ephemeral: true });
      return;
    }

    const botMember = interaction.guild.members.me ?? (await interaction.guild.members.fetchMe().catch(() => null));
    const botPermissions = botMember ? channel.permissionsFor(botMember) : null;

    if (!botPermissions?.has(PermissionFlagsBits.ManageMessages)) {
      await interaction.reply({ embeds: [errorEmbed("KlarBot braucht die Berechtigung Nachrichten verwalten, um Nachrichten zu löschen.")], ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const deletedMessages = await channel.bulkDelete(amount, true).catch(() => null);

    if (!deletedMessages) {
      await interaction.editReply({
        embeds: [
          errorEmbed(
            "Discord konnte die Nachrichten nicht löschen. Bitte prüfe Bot-Rechte, Channel-Zugriff und das 14-Tage-Limit.",
          ),
        ],
      });
      return;
    }

    await interaction.editReply({
      embeds: [
        punishmentEmbed(
          [
            `${deletedMessages.size} Nachrichten gelöscht.`,
            "",
            deletedMessages.size < amount
              ? "Hinweis: Discord überspringt Nachrichten, die älter als 14 Tage sind."
              : null,
          ]
            .filter(Boolean)
            .join("\n"),
          "Nachrichten gelöscht",
        ),
      ],
    });

    await logModerationAction({
      guild: interaction.guild,
      action: "/clear",
      moderator: interaction.user,
      details: `${deletedMessages.size} Nachrichten in #${channel.name} geloescht.`,
    });
  },
};
