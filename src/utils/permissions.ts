import {
  PermissionsBitField,
  type ChatInputCommandInteraction,
  type GuildMember,
} from "discord.js";

import { moderationRoleNames, ticketStaffRoleNames } from "../config/roles.js";

function hasPermission(
  interaction: ChatInputCommandInteraction,
  permission: bigint,
) {
  return Boolean(interaction.memberPermissions?.has(permission));
}

export function hasAdministrator(interaction: ChatInputCommandInteraction) {
  return hasPermission(interaction, PermissionsBitField.Flags.Administrator);
}

export function hasManageGuild(interaction: ChatInputCommandInteraction) {
  return hasPermission(interaction, PermissionsBitField.Flags.ManageGuild);
}

export async function isGuildOwner(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) {
    return false;
  }

  const owner = await interaction.guild.fetchOwner();
  return owner.id === interaction.user.id;
}

export async function canManageKlarBot(interaction: ChatInputCommandInteraction) {
  return (
    hasAdministrator(interaction) ||
    hasManageGuild(interaction) ||
    (await isGuildOwner(interaction))
  );
}

export function hasTeamRole(member: GuildMember) {
  return ticketStaffRoleNames.some((roleName) =>
    member.roles.cache.some((role) => role.name === roleName),
  );
}

export function hasModerationRole(member: GuildMember) {
  return moderationRoleNames.some((roleName) =>
    member.roles.cache.some((role) => role.name === roleName),
  );
}

export async function canUseModeration(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) {
    return false;
  }

  if (hasAdministrator(interaction)) {
    return true;
  }

  const member = await interaction.guild.members.fetch(interaction.user.id);
  return hasTeamRole(member) || hasModerationRole(member);
}

export function moderationPermissionMessage() {
  return "Du brauchst Administratorrechte oder eine KlarApps-Teamrolle, um diesen Moderationscommand zu nutzen.";
}

export function manageGuildPermissionMessage() {
  return "Du brauchst Administratorrechte oder die Berechtigung Server verwalten, um diese Aktion auszuführen.";
}

export function botPermissionMessage(action: string) {
  return `KlarBot fehlen Berechtigungen für: ${action}. Bitte prüfe Bot-Rolle, Rollenposition und Discord-Berechtigungen.`;
}
