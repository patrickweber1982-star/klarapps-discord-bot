import type { ButtonInteraction } from "discord.js";

import {
  communityRoleButtonIds,
  communityRoleList,
} from "../config/communityRoles.js";
import { toggleCommunityButtonRole } from "../utils/communityRoles.js";
import { communityEmbed, errorEmbed } from "../utils/embeds.js";
import { logger } from "../utils/logger.js";

export async function handleRoleButton(interaction: ButtonInteraction) {
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

  const definition = communityRoleList.find((role) => role.buttonId === interaction.customId);

  if (!definition) {
    return false;
  }

  const member = await interaction.guild.members.fetch(interaction.user.id);

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
