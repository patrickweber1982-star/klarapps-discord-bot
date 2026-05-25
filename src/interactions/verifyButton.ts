import { type ButtonInteraction } from "discord.js";

import type { BotConfig } from "../config/env.js";
import { createDashboardSyncClient } from "../features/dashboardSync/dashboardSyncClient.js";
import { verifyCommunityMember } from "../features/welcome/verifyFlow.js";
import { buildWelcomeErrorEmbed } from "../features/welcome/welcomeEmbeds.js";

export const verifyButtonId = "verify:community";
export const verifyButtonPrefix = "verify:confirm";

export async function handleVerifyButton(
  interaction: ButtonInteraction,
  config: BotConfig,
) {
  if (
    interaction.customId !== verifyButtonId &&
    !interaction.customId.startsWith(`${verifyButtonPrefix}:`)
  ) {
    return false;
  }

  if (!interaction.guild) {
    await interaction.reply({
      embeds: [buildWelcomeErrorEmbed("Die Verifizierung ist nur auf einem Discord-Server möglich.")],
      ephemeral: true,
    });
    return true;
  }

  const syncClient = createDashboardSyncClient(config);
  const verifyConfigResult = await syncClient.readVerifyConfig(interaction.guild.id);

  if (!verifyConfigResult.ok) {
    await interaction.reply({
      content:
        "Die Verify-Konfiguration konnte gerade nicht geladen werden. Bitte versuche es spaeter erneut.",
      ephemeral: true,
    });
    return true;
  }

  const verifyConfig = verifyConfigResult.payload.verifyConfig;

  if (!verifyConfig.enabled) {
    await interaction.reply({
      content:
        "Das Verify-Modul ist auf diesem Server derzeit deaktiviert.",
      ephemeral: true,
    });
    return true;
  }

  const member = await interaction.guild.members.fetch(interaction.user.id);
  const result = await verifyCommunityMember(member, {
    verifiedRoleId: verifyConfig.verifiedRoleId,
    removeRoleId: verifyConfig.removeRoleId,
  });

  await interaction.reply({
    embeds: [result.embed],
    ephemeral: true,
  });

  return true;
}
