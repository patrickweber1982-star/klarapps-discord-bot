import type { GuildMember } from "discord.js";

import { ensureCommunityRole } from "../../utils/roles.js";
import {
  buildAlreadyVerifiedEmbed,
  buildCommunityUnlockedEmbed,
  buildWelcomeErrorEmbed,
} from "./welcomeEmbeds.js";
import { logOnboardingStepFailed, logVerifyCompleted } from "./welcomeLogger.js";

export async function verifyCommunityMember(
  member: GuildMember,
  options: {
    verifiedRoleId?: string | null;
    removeRoleId?: string | null;
  } = {},
) {
  try {
    const role = options.verifiedRoleId
      ? await member.guild.roles.fetch(options.verifiedRoleId)
      : await ensureCommunityRole(member.guild);

    if (!role) {
      return buildWelcomeErrorEmbed(
        "Die Verify-Rolle wurde auf diesem Server nicht gefunden. Bitte informiere das Team.",
      );
    }

    if (member.roles.cache.has(role.id)) {
      return buildAlreadyVerifiedEmbed();
    }

    await member.roles.add(role, "KlarBot Verify: Community-Rolle vergeben");

    if (options.removeRoleId && member.roles.cache.has(options.removeRoleId)) {
      await member.roles.remove(
        options.removeRoleId,
        "KlarBot Verify: optionale Rolle entfernt",
      );
    }

    logVerifyCompleted(member.user, member.guild);

    return buildCommunityUnlockedEmbed(member.user);
  } catch (error) {
    logOnboardingStepFailed("verify", error);
    return buildWelcomeErrorEmbed(
      "KlarBot konnte die Community-Rolle nicht vergeben. Bitte informiere das Team.",
    );
  }
}
