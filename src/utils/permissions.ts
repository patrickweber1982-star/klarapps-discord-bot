import {
  PermissionsBitField,
  type ChatInputCommandInteraction,
  type GuildMember,
} from "discord.js";

import { moderationRoleNames } from "../config/roles.js";

export function hasAdministrator(interaction: ChatInputCommandInteraction) {
  return Boolean(
    interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator),
  );
}

export function hasManageGuild(interaction: ChatInputCommandInteraction) {
  return Boolean(interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild));
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
  return hasModerationRole(member);
}
