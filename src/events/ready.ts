import { ActivityType, Events, type Client } from "discord.js";

import { logger } from "../utils/logger.js";

export function registerReadyEvent(client: Client) {
  client.once(Events.ClientReady, (readyClient) => {
    readyClient.user.setPresence({
      activities: [{ name: "KlarApps Systeme", type: ActivityType.Watching }],
      status: "online",
    });

    logger.info(`KlarBot ist online als ${readyClient.user.tag}.`);
  });
}
