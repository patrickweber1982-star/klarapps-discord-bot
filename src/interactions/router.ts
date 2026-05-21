import type { ChatInputCommandInteraction, Interaction } from "discord.js";

import type { BotConfig } from "../config/env.js";
import type { BotCommand } from "../types/command.js";
import { handleHelpButton } from "./helpButtons.js";
import { handleVerifyButton } from "./verifyButton.js";
import { replyWithInteractionError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

type InteractionRouterOptions = {
  commands: Map<string, BotCommand>;
  config: BotConfig;
};

export async function routeInteraction(interaction: Interaction, options: InteractionRouterOptions) {
  if (interaction.isChatInputCommand()) {
    await routeSlashCommand(interaction, options);
    return;
  }

  if (interaction.isButton()) {
    try {
      if (await handleVerifyButton(interaction)) {
        return;
      }

      if (await handleHelpButton(interaction)) {
        return;
      }
    } catch (error) {
      logger.error(`Fehler beim Button ${interaction.customId}`, error);
      await replyWithInteractionError(interaction);
      return;
    }

    logger.warn(`Unbekannte Button-Interaction empfangen: ${interaction.customId}`);
    await interaction.reply({
      content: "Diese Schaltflaeche ist noch nicht verfuegbar.",
      ephemeral: true,
    });
    return;
  }

  if (interaction.isStringSelectMenu()) {
    logger.warn(`Unbekanntes Dropdown empfangen: ${interaction.customId}`);
    await interaction.reply({ content: "Diese Auswahl ist noch nicht verfuegbar.", ephemeral: true });
    return;
  }

  if (interaction.isModalSubmit()) {
    logger.warn(`Unbekanntes Modal empfangen: ${interaction.customId}`);
    await interaction.reply({ content: "Dieses Formular ist noch nicht verfuegbar.", ephemeral: true });
    return;
  }

  logger.debug(`Nicht unterstuetzte Interaction empfangen: ${interaction.type}`);
}

async function routeSlashCommand(
  interaction: ChatInputCommandInteraction,
  options: InteractionRouterOptions,
) {
  const command = options.commands.get(interaction.commandName);

  if (!command) {
    logger.warn(`Unbekannter Slash Command empfangen: /${interaction.commandName}`);
    await interaction.reply({ content: "Unbekannter Command.", ephemeral: true });
    return;
  }

  try {
    logger.info(`Slash Command empfangen: /${interaction.commandName}`);
    await command.execute({
      interaction,
      config: options.config,
      logger,
    });
  } catch (error) {
    logger.error(`Fehler beim Slash Command /${interaction.commandName}`, error);
    await replyWithInteractionError(interaction);
  }
}
