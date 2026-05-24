import { ActionRowBuilder, SlashCommandBuilder, type ButtonBuilder } from "discord.js";

import { communityRoleList } from "../config/communityRoles.js";
import { readRolesChannelsModuleState } from "../features/dashboardSync/verifyModuleState.js";
import type { BotCommand } from "../types/command.js";
import { ensureCommunityButtonRoles } from "../utils/communityRoles.js";
import { primaryButton, secondaryButton } from "../utils/components.js";
import { errorEmbed, rolesEmbed } from "../utils/embeds.js";
import { botPermissionMessage, canModerate, moderationPermissionMessage } from "../utils/permissions.js";

export const rolesCommand: BotCommand = {
  name: "roles",
  data: new SlashCommandBuilder()
    .setName("roles")
    .setDescription("Erstellt ein Rollen-Panel."),
  async execute({ interaction, config }) {
    if (!interaction.guild) {
      await interaction.reply({
        embeds: [errorEmbed("Dieser Command kann nur auf einem Discord-Server genutzt werden.")],
        ephemeral: true,
      });
      return;
    }

    const moduleState = await readRolesChannelsModuleState(
      config,
      interaction.guild.id,
    );

    if (!moduleState.enabled) {
      await interaction.reply({
        embeds: [
          errorEmbed(
            "Rollen & Channels ist fuer diesen Server aktuell im KlarApps Dashboard deaktiviert.",
          ),
        ],
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

    const roles = await ensureCommunityButtonRoles(interaction.guild).catch(() => null);

    if (!roles) {
      await interaction.reply({
        embeds: [
          errorEmbed(
            botPermissionMessage("Community-Rollen erstellen oder verwalten"),
            "Rollenpanel nicht erstellt",
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    const embed = rolesEmbed(
      [
        "Wähle Rollen aus, um Benachrichtigungen und passende Community-Bereiche zu erhalten.",
        "",
        "**Verfügbare Rollen**",
        ...communityRoleList.map((role) => `${role.buttonLabel} - ${role.description}`),
        "",
        "Klicke erneut auf eine Rolle, um sie wieder zu entfernen.",
      ].join("\n"),
      "🎭 Community Rollen",
    );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      primaryButton(communityRoleList[0].buttonId, communityRoleList[0].buttonLabel),
      secondaryButton(communityRoleList[1].buttonId, communityRoleList[1].buttonLabel),
      secondaryButton(communityRoleList[2].buttonId, communityRoleList[2].buttonLabel),
      secondaryButton(communityRoleList[3].buttonId, communityRoleList[3].buttonLabel),
      secondaryButton(communityRoleList[4].buttonId, communityRoleList[4].buttonLabel),
    );

    await interaction.reply({
      embeds: [embed],
      components: [row],
    });
  },
};
