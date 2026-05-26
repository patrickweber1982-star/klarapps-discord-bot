import { PermissionFlagsBits, type Client, type Role } from "discord.js";

import type { DashboardRoleStructureConfig } from "../dashboardSync/dashboardSyncClient.js";
import { logger } from "../../utils/logger.js";

const roleColors: Record<string, number> = {
  "klarapps-teal": 0x22d3ee,
  blue: 0x3b82f6,
  purple: 0x8b5cf6,
  green: 0x22c55e,
  yellow: 0xeab308,
  red: 0xef4444,
  gray: 0x94a3b8,
};

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 100);
}

function colorFor(value: string) {
  return roleColors[value] ?? roleColors["klarapps-teal"];
}

function findRoleByName(roles: Iterable<Role>, roleName: string) {
  const normalized = roleName.toLowerCase();

  for (const role of roles) {
    if (role.name.toLowerCase() === normalized) {
      return role;
    }
  }

  return null;
}

export async function applyRoleStructureForGuild(
  client: Client,
  guildId: string,
  roleStructureConfig: DashboardRoleStructureConfig,
) {
  logger.info(
    `[role-structure] apply job received | guildId=${guildId} | groups=${roleStructureConfig.roleGroups.length}`,
  );

  const guild = await client.guilds.fetch(guildId).catch(() => null);

  if (!guild) {
    logger.warn(
      `[role-structure] apply failed | guildId=${guildId} | reason=guild_not_found`,
    );
    return {
      ok: false as const,
      reason: "guild_not_found",
    };
  }

  const member = await guild.members.fetchMe().catch(() => null);

  if (!member) {
    logger.warn(
      `[role-structure] apply failed | guildId=${guildId} | reason=bot_member_not_found`,
    );
    return {
      ok: false as const,
      reason: "bot_member_not_found",
    };
  }

  if (!member.permissions.has(PermissionFlagsBits.ManageRoles)) {
    logger.warn(
      `[role-structure] apply failed | guildId=${guildId} | reason=missing_manage_roles_permission`,
    );
    return {
      ok: false as const,
      reason: "missing_manage_roles_permission",
    };
  }

  const roles = await guild.roles.fetch();
  const desiredRoles = roleStructureConfig.roleGroups.flatMap((group) =>
    group.roles.map((role) => ({
      groupName: normalizeName(group.name),
      name: normalizeName(role.name),
      color: colorFor(role.color),
    })),
  ).filter((role) => role.name);
  const createdOrUpdated: Role[] = [];
  let createdRoles = 0;
  let updatedRoles = 0;
  let skippedRoles = 0;

  for (const roleConfig of desiredRoles) {
    const existing = findRoleByName(roles.values(), roleConfig.name);

    if (existing) {
      if (existing.managed || existing.id === guild.id || !existing.editable) {
        skippedRoles += 1;
        logger.warn(
          `[role-structure] role not editable | guildId=${guildId} | role=${roleConfig.name}`,
        );
        continue;
      }

      if (existing.color !== roleConfig.color) {
        await existing.edit({
          color: roleConfig.color,
          reason: "KlarApps Dashboard Rollenstruktur",
        });
        updatedRoles += 1;
      } else {
        skippedRoles += 1;
      }

      createdOrUpdated.push(existing);
      continue;
    }

    const created = await guild.roles.create({
      name: roleConfig.name,
      color: roleConfig.color,
      reason: `KlarApps Dashboard Rollenstruktur${roleConfig.groupName ? ` | ${roleConfig.groupName}` : ""}`,
    });

    roles.set(created.id, created);
    createdOrUpdated.push(created);
    createdRoles += 1;
    logger.info(
      `[role-structure] role created | guildId=${guildId} | role=${roleConfig.name}`,
    );
  }

  const botHighestPosition = member.roles.highest.position;
  let orderFailures = 0;

  for (const [index, role] of createdOrUpdated.entries()) {
    const targetPosition = Math.max(1, botHighestPosition - 1 - index);

    if (!role.editable) {
      continue;
    }

    await role
      .setPosition(targetPosition, {
        reason: "KlarApps Dashboard Rollenstruktur Reihenfolge",
      })
      .catch((error) => {
        orderFailures += 1;
        logger.warn(
          `[role-structure] role order failed | guildId=${guildId} | role=${role.name} | reason=${error instanceof Error ? error.message : String(error)}`,
        );
      });
  }

  logger.success(
    `[role-structure] apply success | guildId=${guildId} | createdRoles=${createdRoles} | updatedRoles=${updatedRoles} | skippedRoles=${skippedRoles} | orderFailures=${orderFailures}`,
  );

  return {
    ok: true as const,
    channelId: null,
    createdRoles,
    updatedRoles,
    skippedRoles,
    orderFailures,
  };
}

export async function deleteRoleStructureForGuild(
  client: Client,
  guildId: string,
) {
  logger.warn(`[role-structure] delete job received | guildId=${guildId}`);

  const guild = await client.guilds.fetch(guildId).catch(() => null);

  if (!guild) {
    logger.warn(
      `[role-structure] delete failed | guildId=${guildId} | reason=guild_not_found`,
    );
    return {
      ok: false as const,
      reason: "guild_not_found",
    };
  }

  const member = await guild.members.fetchMe().catch(() => null);

  if (!member) {
    logger.warn(
      `[role-structure] delete failed | guildId=${guildId} | reason=bot_member_not_found`,
    );
    return {
      ok: false as const,
      reason: "bot_member_not_found",
    };
  }

  if (!member.permissions.has(PermissionFlagsBits.ManageRoles)) {
    logger.warn(
      `[role-structure] delete failed | guildId=${guildId} | reason=missing_manage_roles_permission`,
    );
    return {
      ok: false as const,
      reason: "missing_manage_roles_permission",
    };
  }

  const roles = await guild.roles.fetch();
  const deletableRoles = [...roles.values()]
    .filter((role) => role.id !== guild.id)
    .filter((role) => !role.managed)
    .sort((a, b) => a.position - b.position);
  let deletedRoles = 0;
  let skippedRoles = 0;
  let failedRoles = 0;

  for (const role of deletableRoles) {
    if (!role.editable) {
      skippedRoles += 1;
      logger.warn(
        `[role-structure] role delete skipped | guildId=${guildId} | roleId=${role.id} | name=${role.name} | reason=not_editable`,
      );
      continue;
    }

    try {
      logger.warn(
        `[role-structure] deleting role | guildId=${guildId} | roleId=${role.id} | name=${role.name}`,
      );
      await role.delete("KlarApps Dashboard bestehende Rollenstruktur loeschen");
      deletedRoles += 1;
    } catch (error) {
      failedRoles += 1;
      logger.warn(
        `[role-structure] role delete failed | guildId=${guildId} | roleId=${role.id} | reason=${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  if (failedRoles > 0) {
    return {
      ok: false as const,
      reason: `roles_delete_partial_failed:${failedRoles}`,
    };
  }

  logger.success(
    `[role-structure] delete success | guildId=${guildId} | deletedRoles=${deletedRoles} | skippedRoles=${skippedRoles}`,
  );

  return {
    ok: true as const,
    channelId: null,
    deletedRoles,
    skippedRoles,
  };
}
