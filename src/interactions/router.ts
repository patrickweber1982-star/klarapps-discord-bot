import type { ChatInputCommandInteraction, Interaction } from "discord.js";

import type { BotConfig } from "../config/env.js";
import type { BotCommand } from "../types/command.js";
import { handleCreatorButton } from "./creatorButtons.js";
import { handleGiveawayButton } from "./giveawayButtons.js";
import { handleHelpButton } from "./helpButtons.js";
import { handleOnboardingButton } from "./onboardingButtons.js";
import { handleRoleButton } from "./roleButtons.js";
import { handleTicketButton } from "./ticketButtons.js";
import { handleVerifyButton } from "./verifyButton.js";
import { handleSelfRoleInteraction } from "../features/roles/rolesInteraction.js";
import {
  replyWithInteractionError,
  replyWithUnknownInteraction,
} from "../utils/errors.js";
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
      if (await handleOnboardingButton(interaction)) {
        return;
      }

      if (await handleTicketButton(interaction)) {
        return;
      }

      if (await handleVerifyButton(interaction)) {
        return;
      }

      if (await handleHelpButton(interaction)) {
        return;
      }

      if (await handleCreatorButton(interaction)) {
        return;
      }

      if (await handleSelfRoleInteraction(interaction)) {
        return;
      }

      if (await handleRoleButton(interaction)) {
        return;
      }

      if (await handleGiveawayButton(interaction)) {
        return;
      }
    } catch (error) {
      logger.error(`Fehler beim Button ${interaction.customId}`, error);
      await replyWithInteractionError(interaction);
      return;
    }

    logger.warn(`Unbekannte Button-Interaction empfangen: ${interaction.customId}`);
    await replyWithUnknownInteraction(interaction, "Diese Schaltfläche ist nicht mehr aktiv oder gehört zu einer späteren KlarBot-Funktion.");
    return;
  }

  if (interaction.isStringSelectMenu()) {
    logger.warn(`Unbekanntes Dropdown empfangen: ${interaction.customId}`);
    await replyWithUnknownInteraction(interaction, "Diese Auswahl ist aktuell nicht verfügbar.");
    return;
  }

  if (interaction.isModalSubmit()) {
    logger.warn(`Unbekanntes Modal empfangen: ${interaction.customId}`);
    await replyWithUnknownInteraction(interaction, "Dieses Formular ist aktuell nicht verfügbar.");
    return;
  }

  logger.warn(`Nicht unterstützte Interaction empfangen: ${interaction.type}`);
}

async function routeSlashCommand(
  interaction: ChatInputCommandInteraction,
  options: InteractionRouterOptions,
) {
  const command = options.commands.get(interaction.commandName);

  if (!command) {
    logger.warn(`Unbekannter Slash Command empfangen: /${interaction.commandName}`);
    await replyWithUnknownInteraction(interaction, "Dieser Command ist in KlarBot nicht registriert. Nutze `/help` für die aktuelle Übersicht.");
    return;
  }

  try {
    logger.info(`Slash Command empfangen: /${interaction.commandName}`);
    await executeCommandSafely(command, interaction, options);
  } catch (error) {
    logger.error(`Fehler beim Slash Command /${interaction.commandName}`, error);
    await replyWithInteractionError(interaction);
  }
}

async function executeCommandSafely(
  command: BotCommand,
  interaction: ChatInputCommandInteraction,
  options: InteractionRouterOptions,
) {
  await command.execute({
    interaction,
    config: options.config,
    logger,
  });
}
