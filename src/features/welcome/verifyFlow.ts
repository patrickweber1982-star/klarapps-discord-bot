import type { GuildMember } from "discord.js";

import { ensureCommunityRole } from "../../utils/roles.js";
import {
  buildAlreadyVerifiedEmbed,
  buildCommunityUnlockedEmbed,
  buildWelcomeErrorEmbed,
} from "./welcomeEmbeds.js";
import { logOnboardingStepFailed, logVerifyCompleted } from "./welcomeLogger.js";

export async function verifyCommunityMember(member: GuildMember) {
  try {
    const role = await ensureCommunityRole(member.guild);

    if (member.roles.cache.has(role.id)) {
      return buildAlreadyVerifiedEmbed();
    }

    await member.roles.add(role, "KlarBot Verify: Community-Rolle vergeben");
    logVerifyCompleted(member.user, member.guild);

    return buildCommunityUnlockedEmbed(member.user);
  } catch (error) {
    logOnboardingStepFailed("verify", error);
    return buildWelcomeErrorEmbed(
      "KlarBot konnte die Community-Rolle nicht vergeben. Bitte informiere das Team.",
    );
  }
}
