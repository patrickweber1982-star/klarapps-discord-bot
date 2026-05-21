import {
  ChannelType,
  PermissionFlagsBits,
  PermissionsBitField,
  type CategoryChannel,
  type Guild,
  type GuildMember,
  type Role,
  type TextChannel,
  type User,
} from "discord.js";

import { supportCategoryName } from "../config/channels.js";
import { ticketStaffRoleNames } from "../config/roles.js";
import type { TicketType, TicketTypeDefinition } from "../config/tickets.js";
import { ticketTopicPrefix } from "../config/tickets.js";
import { managedRoles } from "../config/roles.js";

export function buildTicketTopic(type: TicketType, userId: string) {
  return `${ticketTopicPrefix}:${type}:${userId}`;
}

export function findOpenTicketChannel(guild: Guild, type: TicketType, userId: string) {
  const topic = buildTicketTopic(type, userId);

  return guild.channels.cache.find((channel): channel is TextChannel => {
    return channel.type === ChannelType.GuildText && channel.topic === topic;
  });
}

export async function ensureSupportCategory(guild: Guild) {
  await guild.channels.fetch();

  const existingCategory = guild.channels.cache.find(
    (channel): channel is CategoryChannel =>
      channel.type === ChannelType.GuildCategory && channel.name === supportCategoryName,
  );

  if (existingCategory) {
    return existingCategory;
  }

  return guild.channels.create({
    name: supportCategoryName,
    type: ChannelType.GuildCategory,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionsBitField.Flags.ViewChannel],
      },
    ],
    reason: "KlarBot Tickets: Support-Kategorie erstellen",
  });
}

export async function createTicketChannel(
  guild: Guild,
  member: GuildMember,
  definition: TicketTypeDefinition,
) {
  const category = await ensureSupportCategory(guild);
  await guild.roles.fetch();

  const channelName = buildTicketChannelName(member.user);

  return guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: category.id,
    topic: buildTicketTopic(definition.type, member.id),
    permissionOverwrites: buildTicketPermissionOverwrites(guild, member),
    reason: `KlarBot Ticket: ${definition.label}`,
  });
}

export function buildTicketChannelName(user: User) {
  const normalizedName = user.username
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}-]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return `ticket-${normalizedName || user.id}`;
}

function buildTicketPermissionOverwrites(guild: Guild, member: GuildMember) {
  const staffRoles = ticketStaffRoleNames
    .map((roleName) => guild.roles.cache.find((role) => role.name === roleName))
    .filter((role): role is Role => Boolean(role));

  const communityRole = guild.roles.cache.find((role) => role.name === managedRoles.community.name);

  return [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionsBitField.Flags.ViewChannel],
    },
    ...(communityRole
      ? [
          {
            id: communityRole.id,
            deny: [PermissionsBitField.Flags.ViewChannel],
          },
        ]
      : []),
    {
      id: member.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.AttachFiles,
        PermissionsBitField.Flags.EmbedLinks,
      ],
    },
    ...staffRoles.map((role) => ({
      id: role.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.ManageMessages,
      ],
    })),
  ];
}

export function canManageTicket(member: GuildMember) {
  return (
    member.permissions.has(PermissionFlagsBits.ManageGuild) ||
    member.permissions.has(PermissionFlagsBits.Administrator) ||
    ticketStaffRoleNames.some((roleName) =>
      member.roles.cache.some((role) => role.name === roleName),
    )
  );
}
