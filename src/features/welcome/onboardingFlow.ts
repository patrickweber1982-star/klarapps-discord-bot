import { ChannelType, type GuildMember } from "discord.js";

import { welcomeChannelName } from "../../config/channels.js";
import { ensureCommunityRole, ensureRulesAcceptedRole } from "../../utils/roles.js";
import {
  buildCommunityUnlockedEmbed,
  buildMemberWelcomeEmbed,
  buildRulesAcceptedEmbed,
  buildWelcomeErrorEmbed,
} from "./welcomeEmbeds.js";
import {
  logOnboardingCompleted,
  logOnboardingStepFailed,
  logUserJoined,
} from "./welcomeLogger.js";

export async function sendWelcomeMessageForMember(member: GuildMember) {
  try {
    logUserJoined(member);
    await member.guild.channels.fetch();

    const channel = member.guild.channels.cache.find((currentChannel) => {
      return currentChannel.type === ChannelType.GuildText && currentChannel.name === welcomeChannelName;
    });

    if (!channel || channel.type !== ChannelType.GuildText) {
      logOnboardingStepFailed("welcome-channel-missing", `Channel fehlt: ${welcomeChannelName}`);
      return;
    }

    await channel.send({
      embeds: [buildMemberWelcomeEmbed(member)],
    });
  } catch (error) {
    logOnboardingStepFailed("welcome-message", error);
  }
}

export async function acceptRulesForMember(member: GuildMember) {
  const role = await ensureRulesAcceptedRole(member.guild);

  if (!member.roles.cache.has(role.id)) {
    await member.roles.add(role, "KlarBot Onboarding: Regeln akzeptiert");
  }

  return buildRulesAcceptedEmbed();
}

export async function unlockCommunityForMember(member: GuildMember) {
  const role = await ensureCommunityRole(member.guild);

  if (member.roles.cache.has(role.id)) {
    return { alreadyVerified: true, embed: null };
  }

  await member.roles.add(role, "KlarBot Onboarding: Community freigeschaltet");
  logOnboardingCompleted(member.user, member.guild);

  return {
    alreadyVerified: false,
    embed: buildCommunityUnlockedEmbed(member.user),
  };
}

export function buildOnboardingFailureEmbed() {
  return buildWelcomeErrorEmbed(
    "KlarBot konnte diesen Schritt nicht abschließen. Bitte informiere das Team, damit Rollen und Bot-Rechte geprüft werden können.",
  );
}
