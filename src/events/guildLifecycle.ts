import { Events, type Client } from "discord.js";

import type { BotConfig } from "../config/env.js";
import { reportDashboardInstallationStatus } from "../features/dashboardSync/syncService.js";
import { logger } from "../utils/logger.js";

export function registerGuildLifecycleEvents(client: Client, config: BotConfig) {
  client.on(Events.GuildCreate, (guild) => {
    logger.info(
      `Dashboard-Sync meldet neue Guild-Installation | guild=${guild.name} | id=${guild.id}`,
    );
    void reportDashboardInstallationStatus(guild, config, true);
  });

  client.on(Events.GuildDelete, (guild) => {
    logger.info(
      `Dashboard-Sync meldet Guild-Entfernung | guild=${guild.name} | id=${guild.id}`,
    );
    void reportDashboardInstallationStatus(guild, config, false);
  });
}
