import { Events, type Client } from "discord.js";

import type { BotConfig } from "../config/env.js";
import { syncCommandsForGuild } from "../features/commands/guildCommandSync.js";
import { reportDashboardInstallationStatus } from "../features/dashboardSync/syncService.js";
import type { BotCommand } from "../types/command.js";
import { logger } from "../utils/logger.js";

export function registerGuildLifecycleEvents(
  client: Client,
  config: BotConfig,
  commands: Map<string, BotCommand>,
) {
  client.on(Events.GuildCreate, async (guild) => {
    logger.info(
      `guildCreate Event empfangen | id=${guild.id} | name=${guild.name}`,
    );

    try {
      await syncCommandsForGuild(guild, commands);
    } catch (error) {
      logger.error(
        `Commands fuer neue Guild konnten nicht registriert werden | guild=${guild.name} | id=${guild.id}`,
        error,
      );
    }

    logger.info(
      `Dashboard-Sync meldet neue Guild-Installation | guild=${guild.name} | id=${guild.id}`,
    );
    void reportDashboardInstallationStatus(guild, config, true);
  });

  client.on(Events.GuildDelete, (guild) => {
    logger.info(
      `guildDelete Event empfangen | guild=${guild.name} | id=${guild.id}`,
    );
    logger.info(
      `Dashboard-Sync meldet Guild-Entfernung | guild=${guild.name} | id=${guild.id}`,
    );
    void reportDashboardInstallationStatus(guild, config, false);
  });
}
