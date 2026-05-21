import { ActionRowBuilder, ChannelType, PermissionFlagsBits, SlashCommandBuilder, type ButtonBuilder } from "discord.js";

import { verifyPanelChannelNames } from "../config/channels.js";
import type { BotCommand } from "../types/command.js";
import { primaryButton } from "../utils/components.js";
import { infoEmbed } from "../utils/embeds.js";
import { hasAdministrator, hasManageGuild, manageGuildPermissionMessage } from "../utils/permissions.js";
import { verifyButtonId } from "../interactions/verifyButton.js";

export const verifyCommand: BotCommand = {
  name: "verify",
  data: new SlashCommandBuilder()
    .setName("verify")
    .setDescription("Erstellt ein Verify-Panel für neue Mitglieder.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute({ interaction }) {
    if (!interaction.guild) {
      await interaction.reply({
        content: "Dieser Command kann nur auf einem Discord-Server genutzt werden.",
        ephemeral: true,
      });
      return;
    }

    if (!hasAdministrator(interaction) && !hasManageGuild(interaction)) {
      await interaction.reply({
        content: manageGuildPermissionMessage(),
        ephemeral: true,
      });
      return;
    }

    if (
      interaction.channel?.type !== ChannelType.GuildText ||
      !verifyPanelChannelNames.includes(interaction.channel.name as (typeof verifyPanelChannelNames)[number])
    ) {
      await interaction.reply({
        content: `Bitte nutze /verify in ${verifyPanelChannelNames.map((name) => `#${name}`).join(" oder ")}.`,
        ephemeral: true,
      });
      return;
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      primaryButton(verifyButtonId, "✅ Verifizieren"),
    );

    await interaction.reply({
      embeds: [
        infoEmbed(
          "Klicke auf den Button, um Zugriff auf die Community zu erhalten.",
          "Willkommen bei KlarApps",
        ),
      ],
      components: [row],
    });
  },
};
