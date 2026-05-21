import { ActionRowBuilder, SlashCommandBuilder, type ButtonBuilder, type TextChannel } from "discord.js";

import { buildGiveawayJoinButtonId } from "../config/giveaways.js";
import type { BotCommand } from "../types/command.js";
import { primaryButton } from "../utils/components.js";
import { errorEmbed, giveawayEmbed } from "../utils/embeds.js";
import { createGiveaway } from "../utils/giveaways.js";
import { canModerate, moderationPermissionMessage } from "../utils/permissions.js";

export const giveawayCommand: BotCommand = {
  name: "giveaway",
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Erstellt ein Giveaway.")
    .addStringOption((option) =>
      option
        .setName("prize")
        .setDescription("Preis des Giveaways.")
        .setRequired(true)
        .setMaxLength(120),
    )
    .addIntegerOption((option) =>
      option
        .setName("duration_minutes")
        .setDescription("Dauer in Minuten.")
        .setMinValue(1)
        .setMaxValue(10080)
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName("winners")
        .setDescription("Anzahl Gewinner.")
        .setMinValue(1)
        .setMaxValue(25),
    ),
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

    if (!interaction.channel || !("send" in interaction.channel)) {
      await interaction.reply({
        embeds: [errorEmbed("Giveaways können nur in Channels mit Schreibzugriff erstellt werden.")],
        ephemeral: true,
      });
      return;
    }

    const prize = interaction.options.getString("prize", true);
    const durationMinutes = interaction.options.getInteger("duration_minutes", true);
    const winners = interaction.options.getInteger("winners") ?? 1;
    const giveaway = createGiveaway({
      prize,
      durationMinutes,
      winners,
      host: interaction.user,
      channel: interaction.channel as Pick<TextChannel, "send">,
    });
    const endTimestamp = Math.floor(giveaway.endAt.getTime() / 1000);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      primaryButton(buildGiveawayJoinButtonId(giveaway.id), "🎉 Teilnehmen"),
    );

    await interaction.reply({
      embeds: [
        giveawayEmbed(
          [
            `**Preis:** ${prize}`,
            `**Gewinner:** ${winners}`,
            `**Endet:** <t:${endTimestamp}:F> (<t:${endTimestamp}:R>)`,
            `**Veranstalter:** ${interaction.user}`,
            "",
            "Klicke auf den Button, um teilzunehmen.",
          ].join("\n"),
          "🎁 Giveaway",
        ).setFooter({ text: "KlarBot Giveaway System" }),
      ],
      components: [row],
    });
  },
};
