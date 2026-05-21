import {
  ActionRowBuilder,
  ChannelType,
  PermissionFlagsBits,
  PermissionsBitField,
  SlashCommandBuilder,
  type ButtonBuilder,
  type CategoryChannel,
  type Guild,
  type OverwriteResolvable,
  type Role,
  type TextChannel,
} from "discord.js";

import {
  klarBotGuideChannelName,
  rulesChannelName,
  setupCategoryDefinitions,
  supportHintChannelName,
  welcomeChannelName,
  type SetupAccess,
} from "../config/channels.js";
import { onboardingButtonIds } from "../config/onboarding.js";
import {
  managedRoles,
  setupRoleDefinitions,
  ticketStaffRoleNames,
} from "../config/roles.js";
import type { BotCommand } from "../types/command.js";
import { primaryButton } from "../utils/components.js";
import { infoEmbed, onboardingEmbed, successEmbed } from "../utils/embeds.js";
import { logger as coreLogger } from "../utils/logger.js";
import { hasAdministrator } from "../utils/permissions.js";

type SetupResult = {
  createdRoles: string[];
  reusedRoles: string[];
  createdCategories: string[];
  reusedCategories: string[];
  createdChannels: string[];
  reusedChannels: string[];
  postedMessages: string[];
  reusedMessages: string[];
};

type SetupRoles = {
  rulesAccepted: Role;
  community: Role;
  proCustomer: Role;
  betaTester: Role;
  teamRoles: Role[];
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

    logger.success(
      `Setup abgeschlossen: ${result.createdRoles.length} Rollen, ${result.createdCategories.length} Kategorien, ${result.createdChannels.length} Channels, ${result.postedMessages.length} Nachrichten erstellt.`,
    );

    await interaction.editReply({
      embeds: [
        successEmbed(
          [
            "KlarApps Onboarding und Serverstruktur wurden geprueft und aktualisiert.",
            "",
            `Rollen erstellt: ${result.createdRoles.length}`,
            `Kategorien erstellt: ${result.createdCategories.length}`,
            `Channels erstellt: ${result.createdChannels.length}`,
            `Setup-Nachrichten erstellt: ${result.postedMessages.length}`,
            "",
            `Wiederverwendet: ${result.reusedRoles.length} Rollen, ${result.reusedCategories.length} Kategorien, ${result.reusedChannels.length} Channels, ${result.reusedMessages.length} Nachrichten`,
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
    postedMessages: [],
    reusedMessages: [],
  };

  await guild.roles.fetch();
  await guild.channels.fetch();

  const roles = await ensureRoles(guild, result);
  await ensureRoleOrder(guild);
  const channels = await ensureCategoriesAndChannels(guild, roles, result);
  await ensureSetupMessages(channels, result);

  return result;
}

async function ensureRoles(guild: Guild, result: SetupResult): Promise<SetupRoles> {
  for (const roleDefinition of setupRoleDefinitions) {
    const existingRole = guild.roles.cache.find((role) => role.name === roleDefinition.name);

    if (existingRole) {
      result.reusedRoles.push(roleDefinition.name);
      continue;
    }

    await guild.roles.create({
      name: roleDefinition.name,
      color: roleDefinition.color,
      permissions: roleDefinition.permissions,
      reason: "KlarBot Setup: KlarApps Rollenstruktur",
    });

    result.createdRoles.push(roleDefinition.name);
  }

  await guild.roles.fetch();

  return {
    rulesAccepted: findRoleOrThrow(guild, managedRoles.rulesAccepted.name),
    community: findRoleOrThrow(guild, managedRoles.community.name),
    proCustomer: findRoleOrThrow(guild, managedRoles.proCustomer.name),
    betaTester: findRoleOrThrow(guild, managedRoles.betaTester.name),
    teamRoles: ticketStaffRoleNames.map((roleName) => findRoleOrThrow(guild, roleName)),
  };
}

async function ensureRoleOrder(guild: Guild) {
  const botMember = guild.members.me ?? (await guild.members.fetchMe().catch(() => null));
  const highestBotPosition = botMember?.roles.highest.position ?? 1;
  let nextPosition = Math.max(1, highestBotPosition - 1);

  for (const roleDefinition of setupRoleDefinitions) {
    const role = guild.roles.cache.find((currentRole) => currentRole.name === roleDefinition.name);

    if (!role || !role.editable) {
      coreLogger.warn(`Rollenreihenfolge konnte nicht angepasst werden: ${roleDefinition.name}`);
      continue;
    }

    await role
      .setPosition(nextPosition, { reason: "KlarBot Setup: Rollenreihenfolge" })
      .catch((error) => {
        coreLogger.warn(`Rollenreihenfolge nicht gesetzt: ${roleDefinition.name}`, error);
      });

    nextPosition = Math.max(1, nextPosition - 1);
  }
}

async function ensureCategoriesAndChannels(
  guild: Guild,
  roles: SetupRoles,
  result: SetupResult,
) {
  const channels = new Map<string, TextChannel>();

  for (const [categoryIndex, categoryDefinition] of setupCategoryDefinitions.entries()) {
    const category = await ensureCategory(
      guild,
      roles,
      categoryDefinition.name,
      categoryDefinition.access,
      categoryIndex,
      result,
    );

    for (const [channelIndex, channelDefinition] of categoryDefinition.channels.entries()) {
      const channel = await ensureTextChannel(
        guild,
        category,
        roles,
        channelDefinition.name,
        channelDefinition.access,
        channelIndex,
        result,
      );

      channels.set(channelDefinition.name, channel);
    }
  }

  return channels;
}

async function ensureCategory(
  guild: Guild,
  roles: SetupRoles,
  categoryName: string,
  access: SetupAccess,
  position: number,
  result: SetupResult,
) {
  const existingCategory = guild.channels.cache.find(
    (channel): channel is CategoryChannel =>
      channel.type === ChannelType.GuildCategory && channel.name === categoryName,
  );

  const overwrites = buildOverwrites(guild, roles, access, true);

  if (existingCategory) {
    result.reusedCategories.push(categoryName);
    await existingCategory.permissionOverwrites.set(overwrites);
    await existingCategory.setPosition(position, {
      reason: "KlarBot Setup: Kategorien sortieren",
    });
    return existingCategory;
  }

  const category = await guild.channels.create({
    name: categoryName,
    type: ChannelType.GuildCategory,
    permissionOverwrites: overwrites,
    reason: "KlarBot Setup: KlarApps Kategorie",
  });

  result.createdCategories.push(categoryName);
  await category.setPosition(position, {
    reason: "KlarBot Setup: Kategorien sortieren",
  });
  return category;
}

async function ensureTextChannel(
  guild: Guild,
  category: CategoryChannel,
  roles: SetupRoles,
  channelName: string,
  access: SetupAccess,
  position: number,
  result: SetupResult,
) {
  const existingChannel = guild.channels.cache.find((channel): channel is TextChannel => {
    return channel.type === ChannelType.GuildText && channel.name === channelName;
  });

  const overwrites = buildOverwrites(guild, roles, access, false);

  if (existingChannel) {
    result.reusedChannels.push(channelName);

    if (existingChannel.parentId !== category.id) {
      await existingChannel.setParent(category.id, {
        reason: "KlarBot Setup: KlarApps Textchannel einsortieren",
      });
    }

    await existingChannel.permissionOverwrites.set(overwrites);
    await existingChannel.setPosition(position, {
      reason: "KlarBot Setup: Channels sortieren",
    });
    return existingChannel;
  }

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites: overwrites,
    reason: "KlarBot Setup: KlarApps Textchannel",
  });

  result.createdChannels.push(channel.name);
  await channel.setPosition(position, {
    reason: "KlarBot Setup: Channels sortieren",
  });
  return channel;
}

function buildOverwrites(
  guild: Guild,
  roles: SetupRoles,
  access: SetupAccess,
  isCategory: boolean,
) {
  const hiddenForEveryone: OverwriteResolvable = {
    id: guild.roles.everyone.id,
    deny: [PermissionsBitField.Flags.ViewChannel],
  };

  const teamAllow: OverwriteResolvable[] = roles.teamRoles.map((role) => ({
    id: role.id,
    allow: [
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.SendMessages,
      PermissionsBitField.Flags.ReadMessageHistory,
      PermissionsBitField.Flags.ManageMessages,
    ],
  }));

  const readOnly = (role: Role): OverwriteResolvable => ({
    id: role.id,
    allow: [
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.ReadMessageHistory,
    ],
    deny: [PermissionsBitField.Flags.SendMessages],
  });

  const writable = (role: Role): OverwriteResolvable => ({
    id: role.id,
    allow: [
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.SendMessages,
      PermissionsBitField.Flags.ReadMessageHistory,
    ],
  });

  if (access === "rules") {
    return [
      {
        id: guild.roles.everyone.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.ReadMessageHistory,
        ],
        deny: [PermissionsBitField.Flags.SendMessages],
      },
      ...teamAllow,
    ];
  }

  if (access === "botGuide") {
    return [hiddenForEveryone, readOnly(roles.rulesAccepted), ...teamAllow];
  }

  if (access === "info") {
    return [hiddenForEveryone, readOnly(roles.community), ...teamAllow];
  }

  if (access === "customer") {
    return [
      hiddenForEveryone,
      writable(roles.proCustomer),
      writable(roles.betaTester),
      ...teamAllow,
    ];
  }

  return [
    hiddenForEveryone,
    writable(roles.community),
    ...(isCategory ? [writable(roles.proCustomer), writable(roles.betaTester)] : []),
    ...teamAllow,
  ];
}

async function ensureSetupMessages(channels: Map<string, TextChannel>, result: SetupResult) {
  await ensureRulesMessage(channels.get(rulesChannelName), result);
  await ensureKlarBotGuideMessage(channels.get(klarBotGuideChannelName), result);
  await ensureWelcomeMessage(channels.get(welcomeChannelName), result);
  await ensureSupportHintMessage(channels.get(supportHintChannelName), result);
}

async function ensureRulesMessage(channel: TextChannel | undefined, result: SetupResult) {
  if (!channel) {
    return;
  }

  await ensureUniqueBotMessage(
    channel,
    onboardingButtonIds.acceptRules,
    {
      embeds: [
        onboardingEmbed(
          [
            "Bitte bestätige die Regeln, bevor du Zugriff auf weitere Bereiche erhältst.",
            "",
            "• Sei respektvoll.",
            "• Kein Spam.",
            "• Keine Werbung ohne Erlaubnis.",
            "• Keine beleidigenden Inhalte.",
            "• Support-Anfragen bitte über Tickets.",
          ].join("\n"),
          "📜 Serverregeln",
        ),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          primaryButton(onboardingButtonIds.acceptRules, "✅ Regeln akzeptieren"),
        ),
      ],
    },
    result,
    "Regel-Embed",
  );
}

async function ensureKlarBotGuideMessage(channel: TextChannel | undefined, result: SetupResult) {
  if (!channel) {
    return;
  }

  await ensureUniqueBotMessage(
    channel,
    onboardingButtonIds.unlockCommunity,
    {
      embeds: [
        onboardingEmbed(
          [
            "KlarBot verbindet Serverstruktur, Support und Rollen in einem klaren System.",
            "",
            "• `/help` zeigt dir die Übersicht.",
            "• `/tickets` öffnet den Support.",
            "• `/verify` schaltet die Community frei.",
            "• Weitere KlarApps-Funktionen werden modular ergänzt.",
          ].join("\n"),
          "🤖 So funktioniert KlarBot",
        ),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          primaryButton(onboardingButtonIds.unlockCommunity, "🚀 Community freischalten"),
        ),
      ],
    },
    result,
    "KlarBot-Erklärung",
  );
}

async function ensureWelcomeMessage(channel: TextChannel | undefined, result: SetupResult) {
  if (!channel) {
    return;
  }

  await ensureUniqueBotMessage(
    channel,
    "klarbot-welcome",
    {
      embeds: [
        onboardingEmbed(
          [
            "Willkommen bei KlarApps. Schön, dass du da bist.",
            "",
            "Nutze `/help`, um KlarBot kennenzulernen. Für Support und Feedback stehen dir Tickets und Community-Channels zur Verfügung.",
          ].join("\n"),
          "👋 Willkommen",
        ),
      ],
    },
    result,
    "Willkommens-Embed",
  );
}

async function ensureSupportHintMessage(channel: TextChannel | undefined, result: SetupResult) {
  if (!channel) {
    return;
  }

  await ensureUniqueBotMessage(
    channel,
    "klarbot-support-hint",
    {
      embeds: [
        infoEmbed(
          "Nutze `/tickets`, um ein Support-, Bug- oder Feature-Ticket zu erstellen.",
          "🎫 Support",
        ),
      ],
    },
    result,
    "Support-Hinweis",
  );
}

async function ensureUniqueBotMessage(
  channel: TextChannel,
  marker: string,
  payload: Parameters<TextChannel["send"]>[0],
  result: SetupResult,
  label: string,
) {
  const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  const alreadyExists = messages?.some((message) => {
    if (!message.author.bot) {
      return false;
    }

    const hasComponent = message.components.some((row) => {
      if (!("components" in row)) {
        return false;
      }

      return row.components.some((component) => {
        return "customId" in component && component.customId === marker;
      });
    });

    const hasFooterMarker = message.embeds.some((embed) => embed.footer?.text?.includes(marker));

    return hasComponent || hasFooterMarker;
  });

  if (alreadyExists) {
    result.reusedMessages.push(label);
    return;
  }

  const sentMessage = await channel.send(payload);

  if (!sentMessage.components.length) {
    await sentMessage.edit({
      embeds: sentMessage.embeds.map((embed) => ({
        ...embed.toJSON(),
        footer: { text: `KlarApps Systeme | ${marker}` },
      })),
    });
  }

  result.postedMessages.push(label);
}

function findRoleOrThrow(guild: Guild, roleName: string) {
  const role = guild.roles.cache.find((currentRole) => currentRole.name === roleName);

  if (!role) {
    throw new Error(`Rolle fehlt nach Setup-Erstellung: ${roleName}`);
  }

  return role;
}
