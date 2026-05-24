import type { ButtonInteraction } from "discord.js";

import type { BotConfig } from "../config/env.js";
import {
  communityRoleButtonIds,
  communityRoleList,
} from "../config/communityRoles.js";
import { readRolesChannelsModuleState } from "../features/dashboardSync/verifyModuleState.js";
import { toggleCommunityButtonRole } from "../utils/communityRoles.js";
import { communityEmbed, errorEmbed } from "../utils/embeds.js";
import { logger } from "../utils/logger.js";

export async function handleRoleButton(
  interaction: ButtonInteraction,
  config: BotConfig,
) {
  if (!communityRoleButtonIds.includes(interaction.customId)) {
    return false;
  }

  if (!interaction.guild) {
    await interaction.reply({
      embeds: [errorEmbed("Rollenbuttons funktionieren nur auf einem Discord-Server.")],
      ephemeral: true,
    });
    return true;
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
    return true;
  }

  const definition = communityRoleList.find((role) => role.buttonId === interaction.customId);

  if (!definition) {
    return false;
  }

  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);

  if (!member) {
    await interaction.reply({
      embeds: [errorEmbed("KlarBot konnte deinen Server-Nutzer nicht finden. Bitte versuche es erneut.")],
      ephemeral: true,
    });
    return true;
  }

  const result = await toggleCommunityButtonRole(member, definition).catch(async (error) => {
    logger.error(`Rollenbutton fehlgeschlagen: ${definition.name}`, error);
    await interaction.reply({
      embeds: [
        errorEmbed(
          "KlarBot konnte diese Rolle nicht ändern. Bitte prüfe Bot-Rolle, Rollenposition und Berechtigungen.",
        ),
      ],
      ephemeral: true,
    });
    return null;
  });

  if (!result) {
    return true;
  }

  const message = result.assigned
    ? `Rolle erfolgreich vergeben: ${result.role}`
    : `Rolle entfernt: ${result.role}`;

  logger.roles(
    result.assigned
      ? `Rolle vergeben: ${result.role.name} an ${interaction.user.tag}`
      : `Rolle entfernt: ${result.role.name} von ${interaction.user.tag}`,
  );

  await interaction.reply({
    embeds: [communityEmbed(message, result.assigned ? "Rolle vergeben" : "Rolle entfernt")],
    ephemeral: true,
  });

  return true;
}
