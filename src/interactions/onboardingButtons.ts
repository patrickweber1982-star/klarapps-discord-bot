import type { ButtonInteraction } from "discord.js";

import { onboardingButtonIds } from "../config/onboarding.js";
import {
  acceptRulesForMember,
  buildOnboardingFailureEmbed,
  unlockCommunityForMember,
} from "../features/welcome/onboardingFlow.js";
import { buildAlreadyVerifiedEmbed } from "../features/welcome/welcomeEmbeds.js";
import { logOnboardingStepFailed } from "../features/welcome/welcomeLogger.js";

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
      embeds: [buildOnboardingFailureEmbed()],
      ephemeral: true,
    });
    return;
  }

  try {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const embed = await acceptRulesForMember(member);

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  } catch (error) {
    logOnboardingStepFailed("accept-rules", error);
    await interaction.reply({
      embeds: [buildOnboardingFailureEmbed()],
      ephemeral: true,
    });
  }
}

async function unlockCommunity(interaction: ButtonInteraction) {
  if (!interaction.guild) {
    await interaction.reply({
      embeds: [buildOnboardingFailureEmbed()],
      ephemeral: true,
    });
    return;
  }

  try {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const result = await unlockCommunityForMember(member);

    await interaction.reply({
      embeds: [result.alreadyVerified ? buildAlreadyVerifiedEmbed() : result.embed ?? buildOnboardingFailureEmbed()],
      ephemeral: true,
    });
  } catch (error) {
    logOnboardingStepFailed("unlock-community", error);
    await interaction.reply({
      embeds: [buildOnboardingFailureEmbed()],
      ephemeral: true,
    });
  }
}
