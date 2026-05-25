import "dotenv/config";

import { Client, Events, GatewayIntentBits, Partials } from "discord.js";

import { createCommandMap } from "./commands/index.js";
import { loadConfig, readDashboardSyncEnvironment } from "./config/env.js";
import { registerEvents } from "./events/index.js";
import { startInternalApiServer } from "./features/internalApi/internalApiServer.js";
import { sendJoinTestMessageForMember } from "./features/joinTest/joinTest.js";
import { registerGlobalErrorHandlers } from "./utils/errors.js";
import { logger } from "./utils/logger.js";

registerGlobalErrorHandlers();

logger.info(`[klarbot-runtime] cwd=${process.cwd()} | entry=${import.meta.url}`);
logger.info("[join-test] module file loaded");

const config = loadConfig();
const commands = createCommandMap();
const intentEntries = [
  { name: "Guilds", value: GatewayIntentBits.Guilds },
  { name: "GuildMessageReactions", value: GatewayIntentBits.GuildMessageReactions },
  { name: "GuildMembers", value: GatewayIntentBits.GuildMembers },
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

logger.info(
  "GuildMembers Intent ist im Bot immer aktiv. Das Privileged Intent muss auch im Discord Developer Portal aktiv sein.",
);

logger.info(
  `[join-test] client intents: ${intentEntries.map((intent) => intent.name).join(", ")}`,
);

const client = new Client({
  intents: intentEntries.map((intent) => intent.value),
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User],
});

client.on(Events.GuildMemberAdd, async (member) => {
  console.log("[DIRECT TEST] guildMemberAdd fired", member.guild.id, member.id);
});

logger.info("[join-test] event registered");
client.on(Events.GuildMemberAdd, async (member) => {
  logger.info(
    `[join-test] guildMemberAdd received | guildId=${member.guild.id} | memberId=${member.id}`,
  );

  try {
    await sendJoinTestMessageForMember(member, config);
  } catch (error) {
    logger.error(
      `[join-test] event error | guildId=${member.guild.id} | memberId=${member.id} | sent=false`,
      error,
    );
  }
});

startInternalApiServer(client, config);
registerEvents({ client, commands, config });

logger.info(`KlarBot startet. Geladene Commands: ${Array.from(commands.keys()).join(", ")}`);

client.login(config.discordBotToken).catch((error) => {
  logger.error("KlarBot konnte nicht gestartet werden", error);
  process.exitCode = 1;
});
