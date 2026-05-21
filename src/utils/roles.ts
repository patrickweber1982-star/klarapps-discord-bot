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
    await updateRoleDisplay(existingRole, definition);
    return existingRole;
  }

  return guild.roles.create({
    name: definition.name,
    color: definition.color,
    permissions: definition.permissions,
    hoist: Boolean(definition.hoist),
    reason: `KlarBot Rolle erstellen: ${definition.name}`,
  });
}

export async function ensureCommunityRole(guild: Guild) {
  return ensureManagedRole(guild, managedRoles.community);
}

export async function ensureRulesAcceptedRole(guild: Guild) {
  return ensureManagedRole(guild, managedRoles.rulesAccepted);
}

async function updateRoleDisplay(role: Role, definition: ManagedRoleDefinition) {
  const shouldHoist = Boolean(definition.hoist);

  if (
    role.hoist === shouldHoist &&
    role.color === definition.color &&
    role.permissions.equals(definition.permissions)
  ) {
    return;
  }

  if (!role.editable) {
    return;
  }

  await role.edit({
    color: definition.color,
    hoist: shouldHoist,
    permissions: definition.permissions,
    reason: `KlarBot Rolle aktualisieren: ${definition.name}`,
  }).catch(() => undefined);
}
