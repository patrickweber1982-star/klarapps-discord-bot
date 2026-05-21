import type { ButtonInteraction } from "discord.js";

import { infoEmbed } from "../utils/embeds.js";

export const helpButtonIds = {
  overview: "help:overview",
  setup: "help:setup",
  support: "help:support",
  roles: "help:roles",
} as const;

const helpButtonContent = {
  [helpButtonIds.overview]: {
    title: "KlarBot Übersicht",
    description:
      "KlarBot ist das zentrale Discord-System fuer KlarApps. Aktuell stellt er Status, Server-Setup und diese Hilfe bereit.",
  },
  [helpButtonIds.setup]: {
    title: "Setup",
    description:
      "`/setup` erstellt die KlarApps Discord-Grundstruktur mit Kategorien, Channels und Basisrollen. Der Command ist nur fuer Administratoren verfuegbar.",
  },
  [helpButtonIds.support]: {
    title: "Support",
    description:
      "`/tickets` erstellt ein Support-Panel. Nutzer koennen Support-, Bug- und Feature-Tickets oeffnen.",
  },
  [helpButtonIds.roles]: {
    title: "Rollen",
    description:
      "Das Verify-System vergibt aktuell die Community-Rolle. Pro-, Beta-, Kunden- und Lizenzrollen sind fuer spaetere Phasen vorbereitet.",
  },
} as const;

export async function handleHelpButton(interaction: ButtonInteraction) {
  const content = helpButtonContent[interaction.customId as keyof typeof helpButtonContent];

  if (!content) {
    return false;
  }

  await interaction.reply({
    embeds: [infoEmbed(content.description, content.title)],
    ephemeral: true,
  });

  return true;
}
