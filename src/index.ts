import { Client, GatewayIntentBits } from "discord.js";

import { createCommandMap } from "./commands/index.js";
import { loadConfig } from "./config/env.js";
import { registerEvents } from "./events/index.js";
import { registerGlobalErrorHandlers } from "./utils/errors.js";
import { logger } from "./utils/logger.js";

registerGlobalErrorHandlers();

const config = loadConfig();
const commands = createCommandMap();
const intents = [GatewayIntentBits.Guilds];

if (process.env.DISCORD_ENABLE_GUILD_MEMBERS_INTENT === "true") {
  intents.push(GatewayIntentBits.GuildMembers);
} else {
  logger.warn(
    "GuildMembers Intent ist deaktiviert. Join-Welcome funktioniert erst mit DISCORD_ENABLE_GUILD_MEMBERS_INTENT=true und aktiviertem Intent im Discord Developer Portal.",
  );
}

const client = new Client({
  intents,
});

registerEvents({ client, commands, config });

logger.info(`KlarBot startet. Geladene Commands: ${Array.from(commands.keys()).join(", ")}`);

client.login(config.discordBotToken).catch((error) => {
  logger.error("KlarBot konnte nicht gestartet werden", error);
  process.exitCode = 1;
});
