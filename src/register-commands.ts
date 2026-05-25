import "dotenv/config";

import { REST, Routes } from "discord.js";

import {
  disabledCommandList,
  getCommandPayloads,
} from "./commands/index.js";
import { loadConfig } from "./config/env.js";
import { logger } from "./utils/logger.js";

const config = loadConfig();
const rest = new REST({ version: "10" }).setToken(config.discordBotToken);
const payloads = getCommandPayloads();

logger.info("Command-Registrierung Ziel: global application commands");
logger.warn(
  `Slashbefehle sind voruebergehend deaktiviert. Nicht registriert: ${disabledCommandList.map((command) => `/${command.name}`).join(", ")}`,
);

await rest.put(Routes.applicationCommands(config.discordClientId), {
  body: payloads,
});

logger.success(
  `Globale Discord-Commands bereinigt. Aktive Commands: ${payloads.length}`,
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
