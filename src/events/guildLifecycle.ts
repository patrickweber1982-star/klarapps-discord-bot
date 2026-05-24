import { Events, type Client } from "discord.js";

import type { BotConfig } from "../config/env.js";
import { reportDashboardInstallationStatus } from "../features/dashboardSync/syncService.js";

export function registerGuildLifecycleEvents(client: Client, config: BotConfig) {
  client.on(Events.GuildCreate, (guild) => {
    void reportDashboardInstallationStatus(guild, config, true);
  });

  client.on(Events.GuildDelete, (guild) => {
    void reportDashboardInstallationStatus(guild, config, false);
  });
}
