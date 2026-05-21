import type { Guild, Role } from "discord.js";

import type { ManagedRoleDefinition } from "../config/roles.js";
import { managedRoles } from "../config/roles.js";

export async function ensureManagedRole(
  guild: Guild,
  definition: ManagedRoleDefinition,
): Promise<Role> {
  await guild.roles.fetch();

  const existingRole = guild.roles.cache.find((role) => role.name === definition.name);

  if (existingRole) {
    return existingRole;
  }

  return guild.roles.create({
    name: definition.name,
    color: definition.color,
    permissions: definition.permissions,
    reason: `KlarBot Rolle erstellen: ${definition.name}`,
  });
}

export async function ensureCommunityRole(guild: Guild) {
  return ensureManagedRole(guild, managedRoles.community);
}
