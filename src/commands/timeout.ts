import { SlashCommandBuilder } from "discord.js";

import type { BotCommand } from "../types/command.js";
import { canActOnMember } from "../utils/moderation.js";
import { errorEmbed, moderationEmbed, successEmbed } from "../utils/embeds.js";
import { logModerationAction } from "../utils/moderationLogs.js";
import { canUseModeration } from "../utils/permissions.js";

export const timeoutCommand: BotCommand = {
  name: "timeout",
  data: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Setzt einen Nutzer in Timeout.")
    .addUserOption((option) =>
      option.setName("user").setDescription("Nutzer fuer den Timeout.").setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName("minutes")
        .setDescription("Dauer in Minuten.")
        .setMinValue(1)
        .setMaxValue(40320)
        .setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("Optionaler Grund."),
    ),
  async execute({ interaction }) {
    if (!interaction.guild) {
      await interaction.reply({ embeds: [errorEmbed("Dieser Command funktioniert nur auf einem Server.")], ephemeral: true });
      return;
    }

    if (!(await canUseModeration(interaction))) {
      await interaction.reply({ embeds: [errorEmbed("Du darfst diesen Moderationscommand nicht nutzen.")], ephemeral: true });
      return;
    }

    const targetUser = interaction.options.getUser("user", true);
    const minutes = interaction.options.getInteger("minutes", true);
    const reason = interaction.options.getString("reason") ?? "Kein Grund angegeben";

    const actor = await interaction.guild.members.fetch(interaction.user.id);
    const target = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!target) {
      await interaction.reply({ embeds: [errorEmbed("Dieser Nutzer konnte auf dem Server nicht gefunden werden.")], ephemeral: true });
      return;
    }

    const memberCheck = await canActOnMember(actor, target);

    if (!memberCheck.allowed) {
      await interaction.reply({ embeds: [errorEmbed(memberCheck.reason ?? "Dieser Nutzer kann nicht moderiert werden.")], ephemeral: true });
      return;
    }

    if (!target.moderatable) {
      await interaction.reply({ embeds: [errorEmbed("KlarBot kann diesen Nutzer nicht in Timeout setzen. Bitte pruefe Bot-Rolle und Berechtigungen.")], ephemeral: true });
      return;
    }

    await target.timeout(minutes * 60 * 1000, reason);

    await interaction.reply({
      embeds: [
        successEmbed(
          `${targetUser} wurde fuer ${minutes} Minuten in Timeout gesetzt.\n**Grund:** ${reason}`,
          "Timeout gesetzt",
        ),
      ],
      ephemeral: true,
    });

    await logModerationAction({
      guild: interaction.guild,
      action: "/timeout",
      moderator: interaction.user,
      target: targetUser,
      reason,
      details: `${minutes} Minuten`,
    });
  },
};
