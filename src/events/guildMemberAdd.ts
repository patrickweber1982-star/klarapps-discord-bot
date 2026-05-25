import { Events, type Client } from "discord.js";

import type { BotConfig } from "../config/env.js";
import { sendJoinMessageForMember } from "../features/joinMessage/joinMessage.js";

export function registerGuildMemberAddEvent(client: Client, config: BotConfig) {
  client.on(Events.GuildMemberAdd, async (member) => {
    await sendJoinMessageForMember(member, config);
  });
}
