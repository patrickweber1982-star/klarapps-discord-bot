import type { Guild, TextBasedChannel, User } from "discord.js";

import { infoEmbed, successEmbed, warningEmbed } from "../../utils/embeds.js";

type TicketCreatedEmbedOptions = {
  user: User;
  ticketChannel: TextBasedChannel;
  guild: Guild;
  ticketType?: string;
};

type TicketClosedEmbedOptions = {
  user?: User | null;
  closedBy: User;
  ticketChannelName: string;
  guild: Guild;
  reason?: string;
};

type TicketErrorEmbedOptions = {
  action: string;
  errorReason: string;
  user?: User | null;
  channelName?: string | null;
  guild?: Guild | null;
};

export function buildTicketCreatedLogEmbed(options: TicketCreatedEmbedOptions) {
  return infoEmbed(
    [
      `**User:** ${options.user}`,
      `**Ticket-Channel:** ${options.ticketChannel}`,
      `**Zeit:** <t:${currentUnixTimestamp()}:F>`,
      `**Guild:** ${options.guild.name}`,
      options.ticketType ? `**Ticket-Typ:** ${options.ticketType}` : null,
      "",
      "**Status:** erstellt",
      "**Hinweis:** Es wurden nur Metadaten geloggt.",
    ]
      .filter(Boolean)
      .join("\n"),
    "🎫 Ticket erstellt",
  );
}

export function buildTicketClosedLogEmbed(options: TicketClosedEmbedOptions) {
  return successEmbed(
    [
      `**User:** ${options.user ?? "Unbekannt"}`,
      `**Geschlossen von:** ${options.closedBy}`,
      `**Ticket-Channel:** #${options.ticketChannelName}`,
      `**Zeit:** <t:${currentUnixTimestamp()}:F>`,
      `**Guild:** ${options.guild.name}`,
      `**Grund:** ${options.reason ?? "Ticket geschlossen"}`,
      "",
      "**Status:** geschlossen",
      "**Hinweis:** Das Transcript wird separat als Markdown-Datei gesendet, sofern moeglich.",
    ].join("\n"),
    "🔒 Ticket geschlossen",
  );
}

export function buildTicketErrorLogEmbed(options: TicketErrorEmbedOptions) {
  return warningEmbed(
    [
      `**Aktion:** ${options.action}`,
      `**Fehlergrund:** ${options.errorReason}`,
      options.user ? `**User:** ${options.user}` : null,
      options.channelName ? `**Channel:** #${options.channelName}` : null,
      options.guild ? `**Guild:** ${options.guild.name}` : null,
      `**Zeit:** <t:${currentUnixTimestamp()}:F>`,
      "",
      "**Status:** Fehler erkannt",
      "**Hinweis:** Der Bot läuft weiter.",
    ]
      .filter(Boolean)
      .join("\n"),
    "⚠️ Ticket Fehler",
  );
}

function currentUnixTimestamp() {
  return Math.floor(Date.now() / 1000);
}
