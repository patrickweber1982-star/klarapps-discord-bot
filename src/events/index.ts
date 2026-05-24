import type { Client } from "discord.js";

import type { BotConfig } from "../config/env.js";
import type { BotCommand } from "../types/command.js";
import { registerGuildLifecycleEvents } from "./guildLifecycle.js";
import { registerGuildMemberAddEvent } from "./guildMemberAdd.js";
import { registerInteractionCreateEvent } from "./interactionCreate.js";
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
  registerGuildMemberAddEvent(options.client);
  registerGuildLifecycleEvents(options.client, options.config);
}
