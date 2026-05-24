import "dotenv/config";

import { REST, Routes } from "discord.js";

import { getCommandPayloads, commandList } from "./commands/index.js";
import { loadConfig } from "./config/env.js";
import { logger } from "./utils/logger.js";

const config = loadConfig();
const rest = new REST({ version: "10" }).setToken(config.discordBotToken);
const payloads = getCommandPayloads();

logger.info("Command-Registrierung Ziel: global application commands");

await rest.put(Routes.applicationCommands(config.discordClientId), {
  body: payloads,
});

logger.success(
  `Globale Discord-Commands registriert: ${commandList.map((command) => `/${command.name}`).join(", ")}`,
);

if (config.discordGuildId) {
  logger.info(
    `Command-Registrierung Ziel: configured guild | id=${config.discordGuildId}`,
  );

  await rest.put(
    Routes.applicationGuildCommands(config.discordClientId, config.discordGuildId),
    {
      body: payloads,
    },
  );

  logger.success(
    `Discord-Commands fuer konfigurierte Guild registriert: ${config.discordGuildId}`,
  );
}
