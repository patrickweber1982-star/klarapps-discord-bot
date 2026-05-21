import type { Client } from "discord.js";

import type { BotConfig } from "../config/env.js";
import type { BotCommand } from "../types/command.js";
import { registerInteractionCreateEvent } from "./interactionCreate.js";
import { registerReadyEvent } from "./ready.js";

type RegisterEventsOptions = {
  client: Client;
  commands: Map<string, BotCommand>;
  config: BotConfig;
};

export function registerEvents(options: RegisterEventsOptions) {
  registerReadyEvent(options.client);
  registerInteractionCreateEvent(options);
}
