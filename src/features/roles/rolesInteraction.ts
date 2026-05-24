import type { ButtonInteraction, GuildMember } from "discord.js";

import type { BotConfig } from "../../config/env.js";
import { readRolesChannelsModuleState } from "../dashboardSync/verifyModuleState.js";
import { communityEmbed, errorEmbed } from "../../utils/embeds.js";
import { logger } from "../../utils/logger.js";
import { getSelfAssignableRoleById } from "./rolesConfig.js";
import type { RoleToggleResult } from "./types.js";

export async function handleSelfRoleInteraction(
  interaction: ButtonInteraction,
  config: BotConfig,
) {
  const selfRole = getSelfAssignableRoleById(interaction.customId);

  if (!selfRole) {
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

  const role = interaction.guild.roles.cache.find((guildRole) => guildRole.name === selfRole.roleName);

  if (!role) {
    await interaction.reply({
      embeds: [
        errorEmbed(
          `Die Rolle ${selfRole.roleName} existiert noch nicht. Bitte lege sie im Server an und versuche es erneut.`,
        ),
      ],
      ephemeral: true,
    });
    return true;
  }

  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);

  if (!member) {
    await interaction.reply({
      embeds: [errorEmbed("KlarBot konnte deinen Server-Nutzer nicht finden.")],
      ephemeral: true,
    });
    return true;
  }

  const result = await toggleRole(member, role.id).catch(async (error) => {
    logger.error(`Self-Role Toggle fehlgeschlagen: ${selfRole.roleName}`, error);
    await interaction.reply({
      embeds: [
        errorEmbed(
          "KlarBot konnte diese Rolle nicht ändern. Bitte prüfe Bot-Rechte und Rollenposition.",
        ),
      ],
      ephemeral: true,
    });
    return null;
  });

  if (!result) {
    return true;
  }

  logger.roles(
    `${result === "added" ? "role added" : "role removed"} | role=${selfRole.roleName} | user=${interaction.user.tag} | guild=${interaction.guild.name}`,
  );

  await interaction.reply({
    embeds: [
      communityEmbed(
        result === "added" ? "✅ Rolle hinzugefügt" : "🗑️ Rolle entfernt",
        "Rollen aktualisiert",
      ),
    ],
    ephemeral: true,
  });

  return true;
}

async function toggleRole(member: GuildMember, roleId: string): Promise<RoleToggleResult> {
  if (member.roles.cache.has(roleId)) {
    await member.roles.remove(roleId, "KlarBot Self-Role entfernt");
    return "removed";
  }

  await member.roles.add(roleId, "KlarBot Self-Role hinzugefügt");
  return "added";
}
