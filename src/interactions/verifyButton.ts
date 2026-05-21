import { type ButtonInteraction, type GuildMember } from "discord.js";

import { ensureCommunityRole } from "../utils/roles.js";

export const verifyButtonId = "verify:community";

export async function handleVerifyButton(interaction: ButtonInteraction) {
  if (interaction.customId !== verifyButtonId) {
    return false;
  }

  if (!interaction.guild) {
    await interaction.reply({
      content: "Die Verifizierung ist nur auf einem Discord-Server moeglich.",
      ephemeral: true,
    });
    return true;
  }

  const communityRole = await ensureCommunityRole(interaction.guild);
  const member = await interaction.guild.members.fetch(interaction.user.id);

  if (memberHasRole(member, communityRole.id)) {
    await interaction.reply({
      content: "Du bist bereits verifiziert.",
      ephemeral: true,
    });
    return true;
  }

  await member.roles.add(communityRole, "KlarBot Verify: Community-Rolle vergeben");

  await interaction.reply({
    content: "Du wurdest erfolgreich verifiziert.",
    ephemeral: true,
  });

  return true;
}

function memberHasRole(member: GuildMember, roleId: string) {
  return member.roles.cache.has(roleId);
}
