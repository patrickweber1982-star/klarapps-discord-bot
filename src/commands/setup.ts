import {
  ChannelType,
  PermissionFlagsBits,
  PermissionsBitField,
  SlashCommandBuilder,
  type CategoryChannel,
  type Guild,
  type Role,
  type TextChannel,
} from "discord.js";

import { setupCategoryDefinitions } from "../config/channels.js";
import { managedRoles, setupRoleDefinitions } from "../config/roles.js";
import type { BotCommand } from "../types/command.js";
import { successEmbed } from "../utils/embeds.js";
import { hasAdministrator } from "../utils/permissions.js";

type SetupResult = {
  createdRoles: string[];
  reusedRoles: string[];
  createdCategories: string[];
  reusedCategories: string[];
  createdChannels: string[];
  reusedChannels: string[];
};

export const setupCommand: BotCommand = {
  name: "setup",
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Erstellt die KlarApps Discord-Grundstruktur.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute({ interaction, logger }) {
    if (!interaction.guild) {
      await interaction.reply({
        content: "Dieser Command kann nur auf einem Discord-Server genutzt werden.",
        ephemeral: true,
      });
      return;
    }

    if (!hasAdministrator(interaction)) {
      await interaction.reply({
        content: "Nur Administratoren duerfen /setup nutzen.",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const result = await setupKlarAppsServer(interaction.guild);

    logger.info(
      `Setup abgeschlossen: ${result.createdRoles.length} Rollen, ${result.createdCategories.length} Kategorien, ${result.createdChannels.length} Channels erstellt.`,
    );

    await interaction.editReply({
      embeds: [
        successEmbed(
          [
            "KlarApps Discordstruktur wurde geprueft und aktualisiert.",
            "",
            `Rollen erstellt: ${result.createdRoles.length}`,
            `Kategorien erstellt: ${result.createdCategories.length}`,
            `Channels erstellt: ${result.createdChannels.length}`,
            "",
            `Wiederverwendet: ${result.reusedRoles.length} Rollen, ${result.reusedCategories.length} Kategorien, ${result.reusedChannels.length} Channels`,
          ].join("\n"),
          "KlarBot Setup abgeschlossen",
        ),
      ],
    });
  },
};

async function setupKlarAppsServer(guild: Guild): Promise<SetupResult> {
  const result: SetupResult = {
    createdRoles: [],
    reusedRoles: [],
    createdCategories: [],
    reusedCategories: [],
    createdChannels: [],
    reusedChannels: [],
  };

  await guild.roles.fetch();
  await guild.channels.fetch();

  const communityRole = await ensureRoles(guild, result);
  await ensureCategoriesAndChannels(guild, communityRole, result);

  return result;
}

async function ensureRoles(guild: Guild, result: SetupResult) {
  let communityRole: Role | null = null;

  for (const roleDefinition of setupRoleDefinitions) {
    const existingRole = guild.roles.cache.find((role) => role.name === roleDefinition.name);

    if (existingRole) {
      result.reusedRoles.push(roleDefinition.name);

      if (roleDefinition.name === managedRoles.community.name) {
        communityRole = existingRole;
      }

      continue;
    }

    const createdRole = await guild.roles.create({
      name: roleDefinition.name,
      color: roleDefinition.color,
      permissions: roleDefinition.permissions,
      reason: "KlarBot Setup: KlarApps Rollenstruktur",
    });

    result.createdRoles.push(roleDefinition.name);

    if (roleDefinition.name === managedRoles.community.name) {
      communityRole = createdRole;
    }
  }

  if (!communityRole) {
    throw new Error("Community-Rolle konnte nicht erstellt oder gefunden werden.");
  }

  return communityRole;
}

async function ensureCategoriesAndChannels(
  guild: Guild,
  communityRole: Role,
  result: SetupResult,
) {
  for (const categoryDefinition of setupCategoryDefinitions) {
    const category = await ensureCategory(
      guild,
      communityRole,
      categoryDefinition.name,
      categoryDefinition.writable,
      result,
    );

    for (const channelName of categoryDefinition.channels) {
      await ensureTextChannel(
        guild,
        category,
        communityRole,
        channelName,
        categoryDefinition.writable,
        result,
      );
    }
  }
}

async function ensureCategory(
  guild: Guild,
  communityRole: Role,
  categoryName: string,
  writable: boolean,
  result: SetupResult,
) {
  const existingCategory = guild.channels.cache.find(
    (channel): channel is CategoryChannel =>
      channel.type === ChannelType.GuildCategory && channel.name === categoryName,
  );

  if (existingCategory) {
    result.reusedCategories.push(categoryName);
    await existingCategory.permissionOverwrites.set(
      buildCommunityOverwrites(guild, communityRole, writable),
    );
    return existingCategory;
  }

  const category = await guild.channels.create({
    name: categoryName,
    type: ChannelType.GuildCategory,
    permissionOverwrites: buildCommunityOverwrites(guild, communityRole, writable),
    reason: "KlarBot Setup: KlarApps Kategorie",
  });

  result.createdCategories.push(categoryName);
  return category;
}

async function ensureTextChannel(
  guild: Guild,
  category: CategoryChannel,
  communityRole: Role,
  channelName: string,
  writable: boolean,
  result: SetupResult,
) {
  const existingChannel = guild.channels.cache.find((channel): channel is TextChannel => {
    return channel.type === ChannelType.GuildText && channel.name === channelName;
  });

  if (existingChannel) {
    result.reusedChannels.push(channelName);

    if (existingChannel.parentId !== category.id) {
      await existingChannel.setParent(category.id, {
        reason: "KlarBot Setup: KlarApps Textchannel einsortieren",
      });
    }

    await existingChannel.permissionOverwrites.set(
      buildCommunityOverwrites(guild, communityRole, writable),
    );
    return existingChannel;
  }

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites: buildCommunityOverwrites(guild, communityRole, writable),
    reason: "KlarBot Setup: KlarApps Textchannel",
  });

  result.createdChannels.push(channel.name);
  return channel;
}

function buildCommunityOverwrites(guild: Guild, communityRole: Role, writable: boolean) {
  return [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionsBitField.Flags.ViewChannel],
    },
    {
      id: communityRole.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.ReadMessageHistory,
      ],
      deny: writable ? [] : [PermissionsBitField.Flags.SendMessages],
    },
  ];
}
