export type TranscriptMetadata = {
  ticketName: string;
  guildName: string;
  createdBy: string;
  closedBy: string;
  channelName: string;
  exportedAt: Date;
};

export type TranscriptMessage = {
  createdAt: Date;
  authorTag: string;
  authorIsBot: boolean;
  content: string;
  attachmentUrls: string[];
};

export function formatTranscript(
  metadata: TranscriptMetadata,
  messages: TranscriptMessage[],
) {
  return [
    "# KlarBot Ticket Transcript",
    "",
    `- Ticket: ${metadata.ticketName}`,
    `- Guild: ${metadata.guildName}`,
    `- Erstellt von: ${metadata.createdBy}`,
    `- Geschlossen von: ${metadata.closedBy}`,
    `- Zeit: ${formatExportTime(metadata.exportedAt)}`,
    `- Channelname: ${metadata.channelName}`,
    "",
    "---",
    "",
    "## Nachrichtenverlauf",
    "",
    messages.length > 0
      ? messages.map(formatTranscriptMessage).join("\n\n")
      : "Keine Nachrichten im Ticket gefunden.",
    "",
  ].join("\n");
}

function formatTranscriptMessage(message: TranscriptMessage) {
  const authorLabel = message.authorIsBot
    ? `${message.authorTag} (Bot)`
    : message.authorTag;
  const lines = [`[${formatMessageTime(message.createdAt)}] ${authorLabel}:`];

  if (message.content.trim().length > 0) {
    lines.push(message.content.trim());
  }

  for (const attachmentUrl of message.attachmentUrls) {
    lines.push("[Attachment]");
    lines.push(attachmentUrl);
  }

  if (lines.length === 1) {
    lines.push("[Keine Textinhalte]");
  }

  return lines.join("\n");
}

function formatMessageTime(date: Date) {
  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatExportTime(date: Date) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
