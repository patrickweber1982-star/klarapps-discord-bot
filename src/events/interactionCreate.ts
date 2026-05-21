import { Events, type Client } from "discord.js";

import type { BotConfig } from "../config/env.js";
import type { BotCommand } from "../types/command.js";
import { routeInteraction } from "../interactions/router.js";
import { replyWithInteractionError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

type RegisterInteractionCreateOptions = {
  client: Client;
  commands: Map<string, BotCommand>;
  config: BotConfig;
};

export function registerInteractionCreateEvent(options: RegisterInteractionCreateOptions) {
  options.client.on(Events.InteractionCreate, async (interaction) => {
    try {
      await routeInteraction(interaction, {
        commands: options.commands,
        config: options.config,
      });
    } catch (error) {
      logger.error("Fehler im Interaction Router", error);

      if (interaction.isRepliable()) {
        await replyWithInteractionError(interaction);
      }
    }
  });
}
