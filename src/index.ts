import { Client, GatewayIntentBits } from "discord.js";

import { createCommandMap } from "./commands/index.js";
import { loadConfig } from "./config/env.js";
import { registerEvents } from "./events/index.js";
import { registerGlobalErrorHandlers } from "./utils/errors.js";
import { logger } from "./utils/logger.js";

registerGlobalErrorHandlers();

const config = loadConfig();
const commands = createCommandMap();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

registerEvents({ client, commands, config });

logger.info(`KlarBot startet. Geladene Commands: ${Array.from(commands.keys()).join(", ")}`);

client.login(config.discordBotToken).catch((error) => {
  logger.error("KlarBot konnte nicht gestartet werden", error);
  process.exitCode = 1;
});
