import type { Client, Guild } from "discord.js";

import type { BotCommand } from "../../types/command.js";
import { logger } from "../../utils/logger.js";

function commandPayloads(commands: Iterable<BotCommand>) {
  return Array.from(commands, (command) => command.data.toJSON());
}

export async function fetchInstalledGuilds(client: Client) {
  logger.info(`Discord Guild Cache vor Fetch: ${client.guilds.cache.size}`);

  const fetchedGuilds = await client.guilds.fetch();
  const guilds: Guild[] = [];

  logger.info(`Discord Guild Count nach API-Fetch: ${fetchedGuilds.size}`);

  for (const fetchedGuild of fetchedGuilds.values()) {
    try {
      const guild = await client.guilds.fetch(fetchedGuild.id);
      guilds.push(guild);
      logger.info(`Discord Guild erkannt | id=${guild.id} | name=${guild.name}`);
    } catch (error) {
      const cachedGuild = client.guilds.cache.get(fetchedGuild.id);

      if (cachedGuild) {
        guilds.push(cachedGuild);
        logger.warn(
          `Discord Guild nur aus Cache nutzbar | id=${cachedGuild.id} | name=${cachedGuild.name}`,
        );
        continue;
      }

      logger.warn(
        `Discord Guild konnte nicht vollstaendig geladen werden | id=${fetchedGuild.id}`,
        error,
      );
    }
  }

  logger.info(`Discord Guild Cache nach Fetch: ${client.guilds.cache.size}`);

  return guilds;
}

export async function syncCommandsForGuild(
  guild: Guild,
  commands: Map<string, BotCommand>,
) {
  const payloads = commandPayloads(commands.values());

  logger.info(
    `Command-Registrierung Ziel: guild | id=${guild.id} | name=${guild.name} | commands=${payloads.length}`,
  );

  await guild.commands.set(payloads);

  logger.success(
    `Commands fuer Guild registriert | guild=${guild.name} | count=${payloads.length}`,
  );
}

export async function syncCommandsForGuilds(
  guilds: Iterable<Guild>,
  commands: Map<string, BotCommand>,
) {
  for (const guild of guilds) {
    try {
      await syncCommandsForGuild(guild, commands);
    } catch (error) {
      logger.error(
        `Commands fuer Guild konnten nicht registriert werden | guild=${guild.name} | id=${guild.id}`,
        error,
      );
    }
  }
}
