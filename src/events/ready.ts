import { ActivityType, Events, type Client } from "discord.js";

import type { BotConfig } from "../config/env.js";
import {
  fetchInstalledGuilds,
  syncCommandsForGuilds,
} from "../features/commands/guildCommandSync.js";
import { startDashboardJobWorker } from "../features/dashboardSync/jobWorker.js";
import { prepareDashboardSyncForGuilds } from "../features/dashboardSync/syncService.js";
import { sendVerifyPanelForGuild } from "../features/verify/verifyPanelSync.js";
import { startYoutubeNotificationWorker } from "../features/youtube/youtubeNotifications.js";
import type { BotCommand } from "../types/command.js";
import { logger } from "../utils/logger.js";

type RegisterReadyEventOptions = {
  client: Client;
  commands: Map<string, BotCommand>;
  config: BotConfig;
};

const presenceMessages = [
  "KlarApps Systeme aktiv",
  "/help für Übersicht",
  "Support & Community",
  "KlarBot aktiv",
] as const;

export function registerReadyEvent(options: RegisterReadyEventOptions) {
  const { client, commands, config } = options;

  client.once(Events.ClientReady, async (readyClient) => {
    let presenceIndex = 0;
    const setPresence = () => {
      const name = presenceMessages[presenceIndex % presenceMessages.length];

      readyClient.user.setPresence({
        activities: [{ name, type: ActivityType.Watching }],
        status: "online",
      });

      presenceIndex += 1;
    };

    setPresence();
    const presenceInterval = setInterval(setPresence, 60_000);
    presenceInterval.unref?.();

    logger.success("Start erfolgreich");
    logger.info(`Botname: ${readyClient.user.tag}`);
    logger.info(`Discord Bot User ID laut Login: ${readyClient.user.id}`);
    logger.info(
      `Discord Application/Client ID laut ENV: ${config.discordClientId}`,
    );

    const runtimeApplicationId = readyClient.application?.id ?? readyClient.user.id;

    if (
      runtimeApplicationId !== config.discordClientId &&
      readyClient.user.id !== config.discordClientId
    ) {
      logger.warn(
        `DISCORD_CLIENT_ID passt nicht zum eingeloggten Bot-Token. Eingeloggter Bot=${readyClient.user.id}, Application=${runtimeApplicationId}, ENV=${config.discordClientId}. Pruefe den Invite-Link: Er muss die Client-ID dieser laufenden Bot-App verwenden.`,
      );
    }

    logger.info(`Aktive Commands: ${Array.from(commands.keys()).map((command) => `/${command}`).join(", ")}`);
    logger.info(`Server verbunden laut Cache: ${readyClient.guilds.cache.size}`);

    try {
      const installedGuilds = await fetchInstalledGuilds(readyClient);

      await syncCommandsForGuilds(installedGuilds, commands);
      void prepareDashboardSyncForGuilds(installedGuilds, config);
      startDashboardJobWorker(readyClient, config);
      startYoutubeNotificationWorker(readyClient, config);

      if (process.env.KLARBOT_SEND_VERIFY_TEST_PANEL === "true") {
        const targetGuildId =
          process.env.KLARBOT_TEST_GUILD_ID?.trim() || installedGuilds[0]?.id;

        if (targetGuildId) {
          await sendVerifyPanelForGuild(readyClient, config, targetGuildId);
        } else {
          logger.warn(
            "Verify-Testpanel wurde angefordert, aber es ist keine Guild verfuegbar.",
          );
        }
      }
    } catch (error) {
      logger.error(
        "Startup Guild Fetch, Command-Sync oder Dashboard-Sync konnte nicht vollstaendig ausgefuehrt werden",
        error,
      );
    }
  });
}
