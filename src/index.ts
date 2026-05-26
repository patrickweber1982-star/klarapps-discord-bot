import "dotenv/config";

import { Client, GatewayIntentBits, Partials } from "discord.js";

import { createCommandMap } from "./commands/index.js";
import { loadConfig, readDashboardSyncEnvironment } from "./config/env.js";
import { registerEvents } from "./events/index.js";
import { startInternalApiServer } from "./features/internalApi/internalApiServer.js";
import { registerGlobalErrorHandlers } from "./utils/errors.js";
import { logger } from "./utils/logger.js";

registerGlobalErrorHandlers();

logger.info(`[klarbot-runtime] cwd=${process.cwd()} | entry=${import.meta.url}`);

const config = loadConfig();
const commands = createCommandMap();

function readIntentFlag(name: string) {
  const value = process.env[name]?.trim().toLowerCase();

  if (!value) {
    return null;
  }

  if (["1", "true", "yes", "on"].includes(value)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(value)) {
    return false;
  }

  return null;
}

const discordGuildMembersIntentFlag = readIntentFlag(
  "DISCORD_ENABLE_GUILD_MEMBERS_INTENT",
);
const legacyGuildMembersIntentFlag = readIntentFlag(
  "KLARBOT_ENABLE_GUILD_MEMBERS_INTENT",
);
const guildMembersIntentEnabled =
  discordGuildMembersIntentFlag ?? legacyGuildMembersIntentFlag ?? false;
const guildMembersIntentSource =
  discordGuildMembersIntentFlag !== null
    ? "DISCORD_ENABLE_GUILD_MEMBERS_INTENT"
    : legacyGuildMembersIntentFlag !== null
      ? "KLARBOT_ENABLE_GUILD_MEMBERS_INTENT"
      : "default";
const intentEntries = [
  { name: "Guilds", value: GatewayIntentBits.Guilds },
  { name: "GuildMessages", value: GatewayIntentBits.GuildMessages },
  { name: "MessageContent", value: GatewayIntentBits.MessageContent },
  { name: "GuildMessageReactions", value: GatewayIntentBits.GuildMessageReactions },
  ...(guildMembersIntentEnabled
    ? [{ name: "GuildMembers", value: GatewayIntentBits.GuildMembers }]
    : []),
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

if (guildMembersIntentEnabled) {
  logger.info(
    `GuildMembers Intent ist aktiv via ${guildMembersIntentSource}. Das Privileged Intent muss auch im Discord Developer Portal fuer genau diese Bot-Application aktiv sein.`,
  );
} else {
  logger.warn(
    `GuildMembers Intent ist deaktiviert via ${guildMembersIntentSource}, damit der Bot stabil online bleibt. Join-Test braucht DISCORD_ENABLE_GUILD_MEMBERS_INTENT=true und aktiviertes Server Members Intent im Discord Developer Portal.`,
  );
}

logger.info(
  `Aktive Discord Intents: ${intentEntries.map((intent) => intent.name).join(", ")}`,
);
logger.info(
  `Discord Intent Bitfield: ${intentEntries
    .map((intent) => intent.value)
    .reduce((sum, value) => sum + value, 0)}`,
);

const client = new Client({
  intents: intentEntries.map((intent) => intent.value),
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User],
});

startInternalApiServer(client, config);
registerEvents({ client, commands, config });

logger.info(`KlarBot startet. Geladene Commands: ${Array.from(commands.keys()).join(", ")}`);

client.login(config.discordBotToken).catch((error) => {
  logger.error("KlarBot konnte nicht gestartet werden", error);
  process.exitCode = 1;
});
