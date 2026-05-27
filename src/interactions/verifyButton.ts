import { type ButtonInteraction } from "discord.js";

import type { BotConfig } from "../config/env.js";
import { createDashboardSyncClient } from "../features/dashboardSync/dashboardSyncClient.js";
import { verifyCommunityMember } from "../features/welcome/verifyFlow.js";
import { buildWelcomeErrorEmbed } from "../features/welcome/welcomeEmbeds.js";
import { logger } from "../utils/logger.js";

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

  if (interaction.user.bot) {
    return true;
  }

  if (!interaction.guild) {
    await interaction.reply({
      embeds: [buildWelcomeErrorEmbed("Die Verifizierung ist nur auf einem Discord-Server möglich.")],
      ephemeral: true,
    });
    return true;
  }

  const [, , customGuildId, customMessageId] = interaction.customId.split(":");
  const guildId = customGuildId && /^\d{8,32}$/.test(customGuildId)
    ? customGuildId
    : interaction.guild.id;
  const messageId = customMessageId || interaction.message.id;

  if (guildId !== interaction.guild.id) {
    logger.warn(
      `Verify-Button ignoriert: Guild-Mismatch | interactionGuild=${interaction.guild.id} | customGuild=${guildId} | message=${messageId}`,
    );
    await interaction.reply({
      content:
        "Dieses Verify-Panel gehoert nicht zu diesem Server. Bitte nutze das aktuelle Panel.",
      ephemeral: true,
    });
    return true;
  }

  const syncClient = createDashboardSyncClient(config);
  const verifyConfigResult = await syncClient.readVerifyConfig(guildId);

  if (!verifyConfigResult.ok) {
    logger.warn(
      `Verify-Button: Config konnte nicht geladen werden | guild=${guildId} | message=${messageId} | configFound=false | roleId=no | reason=${verifyConfigResult.message}`,
    );
    await interaction.reply({
      content:
        "Die Verify-Konfiguration konnte gerade nicht geladen werden. Bitte versuche es spaeter erneut.",
      ephemeral: true,
    });
    return true;
  }

  const verifyConfig = verifyConfigResult.payload.verifyConfig;

  logger.info(
    `Verify-Button: Config geladen | guild=${guildId} | message=${messageId} | configFound=true | roleId=${verifyConfig.verifiedRoleId ? "yes" : "no"} | publishedMessage=${verifyConfig.publishedMessageId || "none"}`,
  );

  if (!verifyConfig.enabled) {
    await interaction.reply({
      content:
        "Das Verify-Modul ist auf diesem Server derzeit deaktiviert.",
      ephemeral: true,
    });
    return true;
  }

  if (!verifyConfig.verifiedRoleId) {
    await interaction.reply({
      content:
        "In der Verify-Konfiguration ist noch keine Rolle nach Bestaetigung gespeichert.",
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
    content: result.message,
    embeds: [result.embed],
    ephemeral: true,
  });

  return true;
}
