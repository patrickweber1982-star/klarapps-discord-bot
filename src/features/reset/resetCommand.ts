import {
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";

import { ticketStaffRoleNames } from "../../config/roles.js";
import type { BotCommand } from "../../types/command.js";
import { errorEmbed, successEmbed, warningEmbed } from "../../utils/embeds.js";
import { botPermissionMessage, hasAdministrator } from "../../utils/permissions.js";
import { buildFeatureUnavailableEmbed, canUseFeature } from "../plans/featureGuard.js";
import { DEFAULT_PLAN } from "../plans/planConfig.js";
import { resetKlarBotServer, type ResetResult } from "./resetService.js";

const allowedResetRoleNames = [
  ticketStaffRoleNames[0],
  ticketStaffRoleNames[1],
] as const;

export const resetServerCommand: BotCommand = {
  name: "reset-server",
  data: new SlashCommandBuilder()
    .setName("reset-server")
    .setDescription("Entfernt bekannte KlarBot Rollen, Channels und Kategorien.")
    .addBooleanOption((option) =>
      option
        .setName("confirm")
        .setDescription("Muss true sein, damit der Reset ausgefuehrt wird.")
        .setRequired(false),
    ),
  async execute({ interaction }) {
    if (!interaction.guild) {
      await interaction.reply({
        embeds: [errorEmbed("Dieser Command kann nur auf einem Discord-Server genutzt werden.")],
        ephemeral: true,
      });
      return;
    }

    if (!canUseFeature(DEFAULT_PLAN, "resetServer")) {
      await interaction.reply({
        embeds: [buildFeatureUnavailableEmbed("resetServer", DEFAULT_PLAN)],
        ephemeral: true,
      });
      return;
    }

    if (!(await canResetServer(interaction))) {
      await interaction.reply({
        embeds: [
          errorEmbed(
            "Du brauchst Administratorrechte oder die Rolle 👑 Founder bzw. 🛠️ Developer, um den Server-Reset zu nutzen.",
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    if (interaction.options.getBoolean("confirm") !== true) {
      await interaction.reply({
        embeds: [buildResetConfirmationEmbed()],
        ephemeral: true,
      });
      return;
    }

    if (!(await botCanReset(interaction))) {
      await interaction.reply({
        embeds: [
          errorEmbed(
            botPermissionMessage("bekannte KlarBot Rollen und Channels loeschen"),
            "Reset nicht moeglich",
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const result = await resetKlarBotServer({
        guild: interaction.guild,
        interactionChannelId: interaction.channelId,
      });

      await interaction.editReply({
        embeds: [buildResetCompletedEmbed(result)],
      });
    } catch (error) {
      await interaction.editReply({
        embeds: [
          errorEmbed(
            "KlarBot konnte den Reset nicht vollstaendig ausfuehren. Bitte pruefe Bot-Rolle, Rollenposition und Channel-Berechtigungen.",
            "Server Reset fehlgeschlagen",
          ),
        ],
      });
    }
  },
};

function buildResetConfirmationEmbed() {
  return warningEmbed(
    [
      "**Dieser Reset loescht bekannte KlarBot-Elemente.**",
      "",
      "Betroffen sein koennen:",
      "• KlarBot Rollen",
      "• KlarBot Text- und Voice-Channels",
      "• KlarBot Kategorien",
      "• offene Ticket-Channels mit KlarBot-Topic",
      "",
      "Nicht betroffen: @everyone, Systemchannels und unbekannte/fremde Elemente.",
      "",
      "Starte nur mit: `/reset-server confirm:true`",
    ].join("\n"),
    "⚠️ Server Reset",
  );
}

function buildResetCompletedEmbed(result: ResetResult) {
  return successEmbed(
    [
      "**KlarBot Reset wurde abgeschlossen.**",
      "",
      `Channels geloescht: ${result.deletedChannels.length}`,
      `Voice-Channels geloescht: ${result.deletedVoiceChannels.length}`,
      `Kategorien geloescht: ${result.deletedCategories.length}`,
      `Rollen geloescht: ${result.deletedRoles.length}`,
      `Uebersprungen: ${result.skipped.length}`,
      "",
      result.skipped.length
        ? `**Hinweise:**\n${result.skipped.slice(0, 8).map((item) => `• ${item}`).join("\n")}`
        : "Keine geschuetzten Elemente mussten uebersprungen werden.",
    ].join("\n"),
    "✅ Server Reset abgeschlossen",
  );
}

async function canResetServer(interaction: ChatInputCommandInteraction) {
  if (hasAdministrator(interaction)) {
    return true;
  }

  const member = await interaction.guild?.members.fetch(interaction.user.id).catch(() => null);

  if (!member) {
    return false;
  }

  return allowedResetRoleNames.some((roleName) =>
    member.roles.cache.some((role) => role.name === roleName),
  );
}

async function botCanReset(interaction: ChatInputCommandInteraction) {
  const botMember = interaction.guild?.members.me
    ?? (await interaction.guild?.members.fetchMe().catch(() => null));

  if (!botMember) {
    return false;
  }

  return botMember.permissions.has([
    PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.ManageRoles,
  ]);
}
