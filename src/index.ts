import "dotenv/config";

import { Client, GatewayIntentBits, Partials } from "discord.js";

import { createCommandMap } from "./commands/index.js";
import { loadConfig, readDashboardSyncEnvironment } from "./config/env.js";
import { registerEvents } from "./events/index.js";
import { startInternalApiServer } from "./features/internalApi/internalApiServer.js";
import { registerGlobalErrorHandlers } from "./utils/errors.js";
import { logger } from "./utils/logger.js";

registerGlobalErrorHandlers();

const config = loadConfig();
const commands = createCommandMap();
const intents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessageReactions,
];
const dashboardSyncEnvironment = readDashboardSyncEnvironment();

logger.info(
  `Dashboard sync base URL configured: ${dashboardSyncEnvironment.apiBaseUrl ? "yes" : "no"}`,
);
logger.info(
  `Dashboard sync secret configured: ${dashboardSyncEnvironment.syncToken ? "yes" : "no"}`,
);
logger.info(
  `KlarBot interne API konfiguriert: ${config.internalApi.enabled ? "aktiv" : "deaktiviert"} | host=${config.internalApi.host} | port=${config.internalApi.port} | secret=${config.internalApi.secret ? "yes" : "no"}`,
);

if (process.env.DISCORD_ENABLE_GUILD_MEMBERS_INTENT === "false") {
  logger.warn(
    "GuildMembers Intent wurde per ENV deaktiviert. Join Message funktioniert dann nicht bei neuen Mitgliedern.",
  );
} else {
  intents.push(GatewayIntentBits.GuildMembers);
  logger.info(
    "GuildMembers Intent ist im Bot aktiviert. Das Privileged Intent muss auch im Discord Developer Portal aktiv sein.",
  );
}

const client = new Client({
  intents,
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User],
});

startInternalApiServer(client, config);
registerEvents({ client, commands, config });

logger.info(`KlarBot startet. Geladene Commands: ${Array.from(commands.keys()).join(", ")}`);

client.login(config.discordBotToken).catch((error) => {
  logger.error("KlarBot konnte nicht gestartet werden", error);
  process.exitCode = 1;
});
