import type { Guild, GuildMember, User } from "discord.js";

import { logger } from "../../utils/logger.js";

export function logUserJoined(member: GuildMember) {
  logger.welcome(`user joined | user=${member.user.tag} | guild=${member.guild.name}`);
}

export function logVerifyCompleted(user: User, guild: Guild) {
  logger.welcome(`verify completed | user=${user.tag} | guild=${guild.name}`);
}

export function logOnboardingCompleted(user: User, guild: Guild) {
  logger.welcome(`onboarding completed | user=${user.tag} | guild=${guild.name}`);
}

export function logOnboardingStepFailed(step: string, error: unknown) {
  logger.welcome(`onboarding step failed | step=${step}`, error);
}
