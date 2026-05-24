import { type ButtonInteraction } from "discord.js";

import type { BotConfig } from "../config/env.js";
import { readVerifyModuleState } from "../features/dashboardSync/verifyModuleState.js";
import { verifyCommunityMember } from "../features/welcome/verifyFlow.js";
import { buildWelcomeErrorEmbed } from "../features/welcome/welcomeEmbeds.js";

export const verifyButtonId = "verify:community";

export async function handleVerifyButton(
  interaction: ButtonInteraction,
  config: BotConfig,
) {
  if (interaction.customId !== verifyButtonId) {
    return false;
  }

  if (!interaction.guild) {
    await interaction.reply({
      embeds: [buildWelcomeErrorEmbed("Die Verifizierung ist nur auf einem Discord-Server möglich.")],
      ephemeral: true,
    });
    return true;
  }

  const moduleState = await readVerifyModuleState(config, interaction.guild.id);

  if (!moduleState.enabled) {
    await interaction.reply({
      content:
        "Das Verify-Modul ist auf diesem Server derzeit deaktiviert.",
      ephemeral: true,
    });
    return true;
  }

  const member = await interaction.guild.members.fetch(interaction.user.id);
  const embed = await verifyCommunityMember(member);

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });

  return true;
}
