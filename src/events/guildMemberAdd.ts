import { Events, type Client } from "discord.js";

import type { BotConfig } from "../config/env.js";
import { sendJoinMessageForMember } from "../features/joinMessage/joinMessage.js";
import { logger } from "../utils/logger.js";

export function registerGuildMemberAddEvent(client: Client, config: BotConfig) {
  client.on(Events.GuildMemberAdd, async (member) => {
    try {
      logger.welcome(
        `guildMemberAdd empfangen | guild=${member.guild.id} | user=${member.user.id}`,
      );
      await sendJoinMessageForMember(member, config);
    } catch (error) {
      logger.error(
        `Join Message Event Fehler | guild=${member.guild.id} | user=${member.user.id}`,
        error,
      );
    }
  });
}
