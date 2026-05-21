import type { InteractionReplyOptions, RepliableInteraction } from "discord.js";

import { errorEmbed, warningEmbed } from "./embeds.js";
import { logger } from "./logger.js";

const fallbackErrorResponse: InteractionReplyOptions = {
  embeds: [
    errorEmbed(
      "KlarBot konnte diese Aktion nicht ausführen. Bitte versuche es erneut oder informiere das Team.",
      "Aktion fehlgeschlagen",
    ),
  ],
  ephemeral: true,
};

export function registerGlobalErrorHandlers() {
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled Promise Rejection abgefangen", reason);
  });

  process.on("uncaughtException", (error) => {
    logger.error("Uncaught Exception abgefangen", error);
  });
}

export async function safeInteractionReply(
  interaction: RepliableInteraction,
  options: InteractionReplyOptions,
) {
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(options);
      return;
    }

    await interaction.reply(options);
  } catch (error) {
    logger.error("Fehlerantwort konnte nicht an Discord gesendet werden", error);
  }
}

export async function replyWithInteractionError(interaction: RepliableInteraction) {
  await safeInteractionReply(interaction, fallbackErrorResponse);
}

export async function replyWithUnknownInteraction(
  interaction: RepliableInteraction,
  message = "Diese Aktion ist aktuell nicht verfügbar oder wurde bereits aktualisiert.",
) {
  await safeInteractionReply(interaction, {
    embeds: [warningEmbed(message, "KlarBot Hinweis")],
    ephemeral: true,
  });
}
