import type { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import type { BotConfig } from "../config/env.js";
import type { logger } from "../utils/logger.js";

export type CommandContext = {
  interaction: ChatInputCommandInteraction;
  config: BotConfig;
  logger: typeof logger;
};

export type BotCommand = {
  name: string;
  data: SlashCommandBuilder;
  execute(context: CommandContext): Promise<void>;
};
