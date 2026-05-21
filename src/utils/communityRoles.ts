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
    await updateCommunityRoleDisplay(existingRole, definition);
    return existingRole;
  }

  return guild.roles.create({
    name: definition.name,
    color: definition.color,
    permissions: [],
    hoist: Boolean(definition.hoist),
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

async function updateCommunityRoleDisplay(
  role: Role,
  definition: CommunityRoleDefinition,
) {
  const shouldHoist = Boolean(definition.hoist);

  if (role.hoist === shouldHoist && role.color === definition.color) {
    return;
  }

  if (!role.editable) {
    return;
  }

  await role.edit({
    color: definition.color,
    hoist: shouldHoist,
    reason: `KlarBot Rollenbutton: ${definition.name}`,
  }).catch(() => undefined);
}
