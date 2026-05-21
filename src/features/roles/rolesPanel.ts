import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";

import type { BotCommand } from "../../types/command.js";
import { errorEmbed, rolesEmbed } from "../../utils/embeds.js";
import { hasAdministrator } from "../../utils/permissions.js";
import {
  getSelfAssignableRolesByCategory,
  SELF_ASSIGNABLE_ROLES,
} from "./rolesConfig.js";

const allowedPanelRoleNames = ["👑 Founder", "🛠️ Developer"] as const;

export const rolesPanelCommand: BotCommand = {
  name: "roles-panel",
  data: new SlashCommandBuilder()
    .setName("roles-panel")
    .setDescription("Erstellt ein Rollen-Panel."),
  async execute({ interaction }) {
    if (!interaction.guild) {
      await interaction.reply({
        embeds: [errorEmbed("Dieser Command kann nur auf einem Discord-Server genutzt werden.")],
        ephemeral: true,
      });
      return;
    }

    if (!(await canCreateRolesPanel(interaction))) {
      await interaction.reply({
        embeds: [
          errorEmbed(
            "Du brauchst Administratorrechte oder die Rolle 👑 Founder bzw. 🛠️ Developer, um dieses Rollenpanel zu erstellen.",
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      embeds: [buildRolesPanelEmbed()],
      components: buildRolesPanelRows(),
    });
  },
};

function buildRolesPanelEmbed() {
  const platformRoles = getSelfAssignableRolesByCategory("platforms");
  const interestRoles = getSelfAssignableRolesByCategory("interests");
  const notificationRoles = getSelfAssignableRolesByCategory("notifications");

  return rolesEmbed(
    [
      "Wähle deine Rollen aus und passe Benachrichtigungen an deine Community-Interessen an.",
      "",
      "**Creator Plattformen**",
      platformRoles.map((role) => role.label).join("  "),
      "",
      "**Interessen**",
      interestRoles.map((role) => role.label).join("  "),
      "",
      "**Benachrichtigungen**",
      notificationRoles.map((role) => role.label).join("  "),
      "",
      "Klicke auf einen Button um Rollen zu erhalten oder zu entfernen.",
    ].join("\n"),
    "🎭 Community Rollen",
  );
}

function buildRolesPanelRows() {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      ...getSelfAssignableRolesByCategory("platforms").map(buildRoleButton),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      ...getSelfAssignableRolesByCategory("interests").map(buildRoleButton),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      ...getSelfAssignableRolesByCategory("notifications").map(buildRoleButton),
    ),
  ];
}

function buildRoleButton(role: (typeof SELF_ASSIGNABLE_ROLES)[number]) {
  return new ButtonBuilder()
    .setCustomId(role.id)
    .setLabel(role.label)
    .setStyle(ButtonStyle.Secondary);
}

async function canCreateRolesPanel(interaction: ChatInputCommandInteraction) {
  if (hasAdministrator(interaction)) {
    return true;
  }

  const member = await interaction.guild?.members.fetch(interaction.user.id).catch(() => null);

  if (!member) {
    return false;
  }

  return allowedPanelRoleNames.some((roleName) =>
    member.roles.cache.some((role) => role.name === roleName),
  );
}
