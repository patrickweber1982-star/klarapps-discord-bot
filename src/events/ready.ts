import { ActivityType, Events, type Client } from "discord.js";

import type { BotCommand } from "../types/command.js";
import { logger } from "../utils/logger.js";

type RegisterReadyEventOptions = {
  client: Client;
  commands: Map<string, BotCommand>;
};

const presenceMessages = [
  "KlarApps Systeme aktiv",
  "/help für Übersicht",
  "Support & Community",
  "KlarBot aktiv",
] as const;

export function registerReadyEvent(options: RegisterReadyEventOptions) {
  const { client, commands } = options;

  client.once(Events.ClientReady, (readyClient) => {
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
    logger.info(`Aktive Commands: ${Array.from(commands.keys()).map((command) => `/${command}`).join(", ")}`);
    logger.info(`Server verbunden: ${readyClient.guilds.cache.size}`);
  });
}
