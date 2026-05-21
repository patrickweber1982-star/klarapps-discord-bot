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
  type VoiceChannel,
} from "discord.js";

import {
  klarBotGuideChannelName,
  rolesOverviewChannelName,
  rulesChannelName,
  setupCategoryDefinitions,
  welcomeChannelName,
  type SetupAccess,
} from "../config/channels.js";
import { onboardingButtonIds } from "../config/onboarding.js";
import {
  buildKlarBotGuideEmbed,
  buildRolesOverviewEmbed,
  buildRulesEmbed,
  buildWelcomeChannelEmbed,
} from "../features/welcome/welcomeEmbeds.js";
import {
  getAvailableTemplateText,
  mergeTemplates,
  parseTemplateCsv,
} from "../features/templates/templateMergeService.js";
import { applyTemplateSetup } from "../features/templates/templateSetupService.js";
import type { TemplateSetupResult } from "../features/templates/templateTypes.js";
import {
  managedRoles,
  setupRoleDefinitions,
  ticketStaffRoleNames,
} from "../config/roles.js";
import type { BotCommand } from "../types/command.js";
import { primaryButton } from "../utils/components.js";
import { errorEmbed, successEmbed } from "../utils/embeds.js";
import { logger as coreLogger } from "../utils/logger.js";
import { botPermissionMessage, hasAdministrator } from "../utils/permissions.js";

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
  supportRoles: Role[];
};

export const setupCommand: BotCommand = {
  name: "setup",
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Erstellt die KlarApps Discord-Grundstruktur.")
    .addStringOption((option) =>
      option
        .setName("templates")
        .setDescription("Optionale Creator Templates als CSV: twitch,youtube,indiedev,support")
        .setRequired(false),
    ),
  async execute({ interaction, logger }) {
    if (!interaction.guild) {
      await interaction.reply({
        content: "Dieser Command kann nur auf einem Discord-Server genutzt werden.",
        ephemeral: true,
      });
      return;
    }

    const templateInput = interaction.options.getString("templates");

    if (templateInput) {
      if (!(await canUseTemplateBuilder(interaction))) {
        await interaction.reply({
          embeds: [
            errorEmbed(
              "Du brauchst Administratorrechte oder die Rolle 👑 Founder bzw. 🛠️ Developer, um Creator Templates zu erstellen.",
            ),
          ],
          ephemeral: true,
        });
        return;
      }

      if (!(await botCanRunSetup(interaction.guild))) {
        await interaction.reply({
          embeds: [
            errorEmbed(
              botPermissionMessage("Rollen und Channels fuer das Creator Setup verwalten"),
              "Setup nicht moeglich",
            ),
          ],
          ephemeral: true,
        });
        return;
      }

      const parsedTemplates = parseTemplateCsv(templateInput);

      if (!parsedTemplates.ok || parsedTemplates.keys.length === 0) {
        await interaction.reply({
          embeds: [
            errorEmbed(
              [
                parsedTemplates.invalidKeys.length
                  ? `Unbekannte Templates: ${parsedTemplates.invalidKeys.join(", ")}`
                  : "Bitte gib mindestens ein Template an.",
                "",
                `Verfügbar: ${getAvailableTemplateText()}`,
                "Beispiel: `twitch,youtube,indiedev`",
              ].join("\n"),
              "Creator Setup nicht gestartet",
            ),
          ],
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      try {
        const mergedSetup = mergeTemplates(parsedTemplates.keys);
        const templateResult = await applyTemplateSetup(interaction.guild, mergedSetup);

        logger.success(
          `Creator Setup abgeschlossen: ${templateResult.createdCategories.length} Kategorien, ${templateResult.createdChannels.length} Channels, ${templateResult.createdRoles.length} Rollen erstellt.`,
        );

        await interaction.editReply({
          embeds: [buildTemplateSummaryEmbed(templateResult)],
        });
      } catch (error) {
        coreLogger.error("Creator Setup konnte nicht abgeschlossen werden", error);
        await interaction.editReply({
          embeds: [
            errorEmbed(
              "KlarBot konnte das Creator Setup nicht vollstaendig ausfuehren. Bitte pruefe Bot-Rolle, Rollenposition und Channel-Berechtigungen.",
              "Creator Setup fehlgeschlagen",
            ),
          ],
        });
      }
      return;
    }

    if (!hasAdministrator(interaction)) {
      await interaction.reply({
        content: "Nur Administratoren duerfen /setup nutzen.",
        ephemeral: true,
      });
      return;
    }

    if (!(await botCanRunSetup(interaction.guild))) {
      await interaction.reply({
        embeds: [
          errorEmbed(
            botPermissionMessage("Rollen und Channels fuer /setup verwalten"),
            "Setup nicht moeglich",
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
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
    } catch (error) {
      coreLogger.error("KlarBot Setup konnte nicht abgeschlossen werden", error);
      await interaction.editReply({
        embeds: [
          errorEmbed(
            "KlarBot konnte /setup nicht vollstaendig ausfuehren. Bitte pruefe Bot-Rolle, Rollenposition und Channel-Berechtigungen.",
            "Setup fehlgeschlagen",
          ),
        ],
      });
    }
  },
};

async function botCanRunSetup(guild: Guild) {
  const botMember = guild.members.me ?? (await guild.members.fetchMe().catch(() => null));

  if (!botMember) {
    return false;
  }

  return botMember.permissions.has([
    PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.ManageRoles,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.ReadMessageHistory,
  ]);
}

async function canUseTemplateBuilder(interaction: Parameters<BotCommand["execute"]>[0]["interaction"]) {
  if (hasAdministrator(interaction)) {
    return true;
  }

  const member = await interaction.guild?.members.fetch(interaction.user.id).catch(() => null);

  if (!member) {
    return false;
  }

  return ["👑 Founder", "🛠️ Developer"].some((roleName) =>
    member.roles.cache.some((role) => role.name === roleName),
  );
}

function buildTemplateSummaryEmbed(result: TemplateSetupResult) {
  return successEmbed(
    [
      `**Templates:** ${result.selectedTemplates.join(", ")}`,
      "",
      `**Kategorien erstellt:** ${result.createdCategories.length}`,
      result.createdCategories.length ? result.createdCategories.join("\n") : "Keine",
      "",
      `**Channels erstellt:** ${result.createdChannels.length}`,
      result.createdChannels.length ? result.createdChannels.join("\n") : "Keine",
      "",
      `**Rollen erstellt:** ${result.createdRoles.length}`,
      result.createdRoles.length ? result.createdRoles.join("\n") : "Keine",
      "",
      `**Übersprungen:** ${result.skippedCategories.length} Kategorien, ${result.skippedChannels.length} Channels, ${result.skippedRoles.length} Rollen`,
      "",
      "**Nächste Schritte**",
      "• `/roles-panel` senden",
      "• Giveaway testen",
      "• Verify prüfen",
      "• Tickets prüfen",
    ].join("\n"),
    "✅ Creator Setup erfolgreich erstellt",
  );
}

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
    supportRoles: findOptionalRoles(guild, ["🤝 Supporter"]),
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
      if ("type" in channelDefinition && channelDefinition.type === "voice") {
        await ensureVoiceChannel(
          guild,
          category,
          roles,
          channelDefinition.name,
          channelDefinition.access,
          channelIndex,
          result,
        );
        continue;
      }

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

async function ensureVoiceChannel(
  guild: Guild,
  category: CategoryChannel,
  roles: SetupRoles,
  channelName: string,
  access: SetupAccess,
  position: number,
  result: SetupResult,
) {
  const existingChannel = guild.channels.cache.find((channel): channel is VoiceChannel => {
    return channel.type === ChannelType.GuildVoice && channel.name === channelName;
  });

  const overwrites = buildOverwrites(guild, roles, access, false);

  if (existingChannel) {
    result.reusedChannels.push(channelName);

    if (existingChannel.parentId !== category.id) {
      await existingChannel.setParent(category.id, {
        reason: "KlarBot Setup: KlarApps Voicechannel einsortieren",
      });
    }

    await existingChannel.permissionOverwrites.set(overwrites);
    await existingChannel.setPosition(position, {
      reason: "KlarBot Setup: Voicechannels sortieren",
    });
    return existingChannel;
  }

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildVoice,
    parent: category.id,
    permissionOverwrites: overwrites,
    reason: "KlarBot Setup: KlarApps Voicechannel",
  });

  result.createdChannels.push(channel.name);
  await channel.setPosition(position, {
    reason: "KlarBot Setup: Voicechannels sortieren",
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

  const voiceAccess = (role: Role): OverwriteResolvable => ({
    id: role.id,
    allow: [
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.Connect,
      PermissionsBitField.Flags.Speak,
      PermissionsBitField.Flags.UseVAD,
    ],
  });

  const teamVoiceAllow: OverwriteResolvable[] = roles.teamRoles.map((role) => ({
    id: role.id,
    allow: [
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.Connect,
      PermissionsBitField.Flags.Speak,
      PermissionsBitField.Flags.UseVAD,
      PermissionsBitField.Flags.MoveMembers,
    ],
  }));

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

  if (access === "team") {
    return [hiddenForEveryone, ...teamAllow];
  }

  if (access === "ticketLogs") {
    const supportAllow: OverwriteResolvable[] = roles.supportRoles.map((role) => ({
      id: role.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.ReadMessageHistory,
      ],
      deny: [PermissionsBitField.Flags.SendMessages],
    }));

    return [hiddenForEveryone, ...teamAllow, ...supportAllow];
  }

  if (access === "voice") {
    return [hiddenForEveryone, voiceAccess(roles.community), ...teamVoiceAllow];
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
  await ensureRolesOverviewMessage(channels.get(rolesOverviewChannelName), result);
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
        buildRulesEmbed(),
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
        buildKlarBotGuideEmbed(),
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
        buildWelcomeChannelEmbed(channel.guild.name),
      ],
    },
    result,
    "Willkommens-Embed",
  );
}

async function ensureRolesOverviewMessage(channel: TextChannel | undefined, result: SetupResult) {
  if (!channel) {
    return;
  }

  await ensureUniqueBotMessage(
    channel,
    "klarbot-roles-overview",
    {
      embeds: [
        buildRolesOverviewEmbed(),
      ],
    },
    result,
    "Rollenübersicht",
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

  if (!messages) {
    coreLogger.warn(`Setup-Nachricht nicht geprueft: ${label} in #${channel.name}`);
    result.reusedMessages.push(`${label} (nicht geprueft)`);
    return;
  }

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

function findOptionalRoles(guild: Guild, roleNames: string[]) {
  return roleNames
    .map((roleName) => guild.roles.cache.find((currentRole) => currentRole.name === roleName))
    .filter((role): role is Role => Boolean(role));
}
