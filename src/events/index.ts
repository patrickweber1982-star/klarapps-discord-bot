import type { Client } from "discord.js";

import type { BotConfig } from "../config/env.js";
import { registerAutoDeleteMessageCreateEvent } from "../features/autoDelete/autoDelete.js";
import { registerAutoFaqMessageCreateEvent } from "../features/autoFaq/autoFaq.js";
import type { BotCommand } from "../types/command.js";
import { registerGuildLifecycleEvents } from "./guildLifecycle.js";
import { registerGuildMemberAddEvent } from "./guildMemberAdd.js";
import { registerInteractionCreateEvent } from "./interactionCreate.js";
import { registerMessageReactionAddEvent } from "./messageReactionAdd.js";
import { registerReadyEvent } from "./ready.js";

type RegisterEventsOptions = {
  client: Client;
  commands: Map<string, BotCommand>;
  config: BotConfig;
};

export function registerEvents(options: RegisterEventsOptions) {
  registerReadyEvent({
    client: options.client,
    commands: options.commands,
    config: options.config,
  });
  registerInteractionCreateEvent(options);
  registerMessageReactionAddEvent(options.client, options.config);
  registerAutoDeleteMessageCreateEvent(options.client, options.config);
  registerAutoFaqMessageCreateEvent(options.client, options.config);
  registerGuildMemberAddEvent(options.client, options.config);
  registerGuildLifecycleEvents(options.client, options.config, options.commands);
}
