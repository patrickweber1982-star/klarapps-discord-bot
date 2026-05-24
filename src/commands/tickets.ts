import { ActionRowBuilder, PermissionFlagsBits, SlashCommandBuilder, type ButtonBuilder } from "discord.js";

import { ticketButtonIds, ticketTypes } from "../config/tickets.js";
import { readTicketModuleState } from "../features/dashboardSync/verifyModuleState.js";
import { buildFeatureUnavailableEmbed, canUseFeature } from "../features/plans/featureGuard.js";
import { DEFAULT_PLAN } from "../features/plans/planConfig.js";
import type { BotCommand } from "../types/command.js";
import { primaryButton, secondaryButton } from "../utils/components.js";
import { infoEmbed } from "../utils/embeds.js";
import { hasAdministrator, hasManageGuild, manageGuildPermissionMessage } from "../utils/permissions.js";

export const ticketsCommand: BotCommand = {
  name: "tickets",
  data: new SlashCommandBuilder()
    .setName("tickets")
    .setDescription("Erstellt ein Ticket-Panel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute({ interaction, config }) {
    if (!interaction.guild) {
      await interaction.reply({
        content: "Dieser Command kann nur auf einem Discord-Server genutzt werden.",
        ephemeral: true,
      });
      return;
    }

    if (!canUseFeature(DEFAULT_PLAN, "tickets")) {
      await interaction.reply({
        embeds: [buildFeatureUnavailableEmbed("tickets", DEFAULT_PLAN)],
        ephemeral: true,
      });
      return;
    }

    const moduleState = await readTicketModuleState(config, interaction.guild.id);

    if (!moduleState.enabled) {
      await interaction.reply({
        content:
          "Das Ticketsystem ist fuer diesen Server aktuell im KlarApps Dashboard deaktiviert.",
        ephemeral: true,
      });
      return;
    }

    if (!hasAdministrator(interaction) && !hasManageGuild(interaction)) {
      await interaction.reply({
        content: manageGuildPermissionMessage(),
        ephemeral: true,
      });
      return;
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      primaryButton(ticketButtonIds.support, ticketTypes.support.buttonLabel),
      secondaryButton(ticketButtonIds.bug, ticketTypes.bug.buttonLabel),
      secondaryButton(ticketButtonIds.feature, ticketTypes.feature.buttonLabel),
    );

    const embed = infoEmbed(
      [
        "Wähle eine Kategorie und öffne ein Support-Ticket.",
        "",
        "**Kategorien**",
        "🛠️ Support - Hilfe zu KlarApps und Nutzung.",
        "🐞 Bug Report - Fehler sauber melden.",
        "💡 Feature-Wunsch - Ideen fuer kommende Versionen.",
      ].join("\n"),
      "🎫 KlarBot Support",
    );

    await interaction.reply({
      embeds: [
        embed,
      ],
      components: [row],
    });
  },
};
