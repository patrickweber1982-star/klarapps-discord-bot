import type { InteractionReplyOptions, RepliableInteraction } from "discord.js";

import { logger } from "./logger.js";

const fallbackErrorResponse: InteractionReplyOptions = {
  content: "KlarBot konnte diese Aktion nicht ausfuehren. Bitte versuche es erneut.",
  ephemeral: true,
};

export function registerGlobalErrorHandlers() {
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled Promise Rejection", reason);
  });

  process.on("uncaughtException", (error) => {
    logger.error("Uncaught Exception", error);
  });
}

export async function replyWithInteractionError(interaction: RepliableInteraction) {
  if (interaction.replied || interaction.deferred) {
    await interaction.followUp(fallbackErrorResponse);
    return;
  }

  await interaction.reply(fallbackErrorResponse);
}
