import { Events, type Client } from "discord.js";

import { sendWelcomeMessageForMember } from "../features/welcome/onboardingFlow.js";

export function registerGuildMemberAddEvent(client: Client) {
  client.on(Events.GuildMemberAdd, async (member) => {
    await sendWelcomeMessageForMember(member);
  });
}
