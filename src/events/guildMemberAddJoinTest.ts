import { Events, type Client } from "discord.js";

import type { BotConfig } from "../config/env.js";
import { sendJoinTestMessageForMember } from "../features/joinTest/joinTest.js";
import { logger } from "../utils/logger.js";

logger.info("[join-test] guildMemberAdd event module loaded");

export function registerGuildMemberAddJoinTestEvent(
  client: Client,
  config: BotConfig,
) {
  logger.info("[join-test] event registered");

  client.on(Events.GuildMemberAdd, async (member) => {
    logger.info(
      `[join-test] guildMemberAdd received | guildId=${member.guild.id} | memberId=${member.id}`,
    );

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
