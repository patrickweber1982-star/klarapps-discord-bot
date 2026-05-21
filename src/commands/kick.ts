import { SlashCommandBuilder } from "discord.js";

import type { BotCommand } from "../types/command.js";
import { canActOnMember } from "../utils/moderation.js";
import { errorEmbed, successEmbed } from "../utils/embeds.js";
import { logModerationAction } from "../utils/moderationLogs.js";
import { canUseModeration } from "../utils/permissions.js";

export const kickCommand: BotCommand = {
  name: "kick",
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kickt einen Nutzer.")
    .addUserOption((option) =>
      option.setName("user").setDescription("Nutzer, der gekickt werden soll.").setRequired(true),
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
    const reason = interaction.options.getString("reason") ?? "Kein Grund angegeben";
    const actor = await interaction.guild.members.fetch(interaction.user.id);
    const target = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!target) {
      await interaction.reply({ embeds: [errorEmbed("Dieser Nutzer konnte auf dem Server nicht gefunden werden.")], ephemeral: true });
      return;
    }

    const memberCheck = await canActOnMember(actor, target);

    if (!memberCheck.allowed) {
      await interaction.reply({ embeds: [errorEmbed(memberCheck.reason ?? "Dieser Nutzer kann nicht gekickt werden.")], ephemeral: true });
      return;
    }

    if (!target.kickable) {
      await interaction.reply({ embeds: [errorEmbed("KlarBot kann diesen Nutzer nicht kicken. Bitte pruefe Bot-Rolle und Berechtigungen.")], ephemeral: true });
      return;
    }

    await target.kick(reason);

    await interaction.reply({
      embeds: [successEmbed(`${targetUser.tag} wurde gekickt.\n**Grund:** ${reason}`, "Nutzer gekickt")],
      ephemeral: true,
    });

    await logModerationAction({
      guild: interaction.guild,
      action: "/kick",
      moderator: interaction.user,
      target: targetUser,
      reason,
    });
  },
};
