import type { Guild, GuildMember, Role } from "discord.js";

import {
  communityRoleList,
  type CommunityRoleDefinition,
} from "../config/communityRoles.js";

export async function ensureCommunityButtonRole(
  guild: Guild,
  definition: CommunityRoleDefinition,
): Promise<Role> {
  await guild.roles.fetch();

  const existingRole = guild.roles.cache.find((role) => role.name === definition.name);

  if (existingRole) {
    return existingRole;
  }

  return guild.roles.create({
    name: definition.name,
    color: definition.color,
    permissions: [],
    reason: `KlarBot Rollenbutton: ${definition.name}`,
  });
}

export async function ensureCommunityButtonRoles(guild: Guild) {
  const roles: Role[] = [];

  for (const definition of communityRoleList) {
    roles.push(await ensureCommunityButtonRole(guild, definition));
  }

  return roles;
}

export async function toggleCommunityButtonRole(
  member: GuildMember,
  definition: CommunityRoleDefinition,
) {
  const role = await ensureCommunityButtonRole(member.guild, definition);

  if (member.roles.cache.has(role.id)) {
    await member.roles.remove(role, "KlarBot Rollenbutton: Rolle entfernt");
    return { role, assigned: false };
  }

  await member.roles.add(role, "KlarBot Rollenbutton: Rolle vergeben");
  return { role, assigned: true };
}
