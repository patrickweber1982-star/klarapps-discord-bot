import type { ButtonInteraction } from "discord.js";

import { onboardingButtonIds } from "../config/onboarding.js";
import { ensureCommunityRole, ensureRulesAcceptedRole } from "../utils/roles.js";

export async function handleOnboardingButton(interaction: ButtonInteraction) {
  if (interaction.customId === onboardingButtonIds.acceptRules) {
    await acceptRules(interaction);
    return true;
  }

  if (interaction.customId === onboardingButtonIds.unlockCommunity) {
    await unlockCommunity(interaction);
    return true;
  }

  return false;
}

async function acceptRules(interaction: ButtonInteraction) {
  if (!interaction.guild) {
    await interaction.reply({
      content: "Diese Aktion ist nur auf einem Discord-Server moeglich.",
      ephemeral: true,
    });
    return;
  }

  const role = await ensureRulesAcceptedRole(interaction.guild);
  const member = await interaction.guild.members.fetch(interaction.user.id);

  if (!member.roles.cache.has(role.id)) {
    await member.roles.add(role, "KlarBot Onboarding: Regeln akzeptiert");
  }

  await interaction.reply({
    content: "Regeln akzeptiert. Lies jetzt die KlarBot-Erklärung.",
    ephemeral: true,
  });
}

async function unlockCommunity(interaction: ButtonInteraction) {
  if (!interaction.guild) {
    await interaction.reply({
      content: "Diese Aktion ist nur auf einem Discord-Server moeglich.",
      ephemeral: true,
    });
    return;
  }

  const role = await ensureCommunityRole(interaction.guild);
  const member = await interaction.guild.members.fetch(interaction.user.id);

  if (member.roles.cache.has(role.id)) {
    await interaction.reply({
      content: "Du bist bereits in der Community freigeschaltet.",
      ephemeral: true,
    });
    return;
  }

  await member.roles.add(role, "KlarBot Onboarding: Community freigeschaltet");

  await interaction.reply({
    content: "Willkommen in der Community.",
    ephemeral: true,
  });
}
