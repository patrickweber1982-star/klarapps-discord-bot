import { REST, Routes } from "discord.js";

import { getCommandPayloads, commandList } from "./commands/index.js";
import { loadConfig } from "./config/env.js";
import { logger } from "./utils/logger.js";

const config = loadConfig();
const rest = new REST({ version: "10" }).setToken(config.discordBotToken);

await rest.put(Routes.applicationGuildCommands(config.discordClientId, config.discordGuildId), {
  body: getCommandPayloads(),
});

logger.success(
  `Discord-Commands registriert: ${commandList.map((command) => `/${command.name}`).join(", ")}`,
);
