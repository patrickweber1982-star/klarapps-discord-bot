import type { GuildMember } from "discord.js";

export async function getGuildOwnerId(member: GuildMember) {
  const owner = await member.guild.fetchOwner();
  return owner.id;
}

export function isHigherOrEqualRole(actor: GuildMember, target: GuildMember) {
  return actor.roles.highest.comparePositionTo(target.roles.highest) <= 0;
}

export async function canActOnMember(actor: GuildMember, target: GuildMember) {
  const ownerId = await getGuildOwnerId(actor);

  if (target.id === ownerId) {
    return { allowed: false, reason: "Der Server-Owner kann nicht moderiert werden." };
  }

  if (actor.id !== ownerId && isHigherOrEqualRole(actor, target)) {
    return {
      allowed: false,
      reason: "Dieser Nutzer hat eine gleich hohe oder hoehere Rolle.",
    };
  }

  return { allowed: true, reason: null };
}
