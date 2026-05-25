import { Events, type Client } from "discord.js";

import type { BotConfig } from "../config/env.js";
import { sendJoinTestMessageForMember } from "../features/joinTest/joinTest.js";
import { logger } from "../utils/logger.js";

export function registerGuildMemberAddJoinTestEvent(
  client: Client,
  config: BotConfig,
) {
  client.on(Events.GuildMemberAdd, async (member) => {
    try {
      await sendJoinTestMessageForMember(member, config);
    } catch (error) {
      logger.error(
        `[join-test] event error | guildId=${member.guild.id} | memberId=${member.id} | sent=false`,
        error,
      );
    }
  });
}
