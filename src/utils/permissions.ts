import { PermissionsBitField, type ChatInputCommandInteraction } from "discord.js";

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
