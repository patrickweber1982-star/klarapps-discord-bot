import type { Message, TextChannel } from "discord.js";

import {
  formatTranscript,
  type TranscriptMessage,
} from "./transcriptFormatter.js";
import {
  logTranscriptCreated,
  logTranscriptFailed,
  logTranscriptStarted,
} from "./transcriptLogger.js";

export type TicketTranscript = {
  fileName: string;
  content: string;
  messageCount: number;
  exportedAt: Date;
  ticketName: string;
  channelName: string;
};

type BuildTicketTranscriptOptions = {
  channel: TextChannel;
  guildName: string;
  createdBy: string;
  closedBy: string;
};

const transcriptMessageLimit = 100;

export async function buildTicketTranscript(
  options: BuildTicketTranscriptOptions,
): Promise<TicketTranscript> {
  logTranscriptStarted(
    `channel=${options.channel.name} | guild=${options.guildName}`,
  );

  try {
    const exportedAt = new Date();
    const fetchedMessages = await options.channel.messages.fetch({
      limit: transcriptMessageLimit,
    });
    const transcriptMessages = [...fetchedMessages.values()]
      .filter((message) => !message.system)
      .sort((firstMessage, secondMessage) => {
        return firstMessage.createdTimestamp - secondMessage.createdTimestamp;
      })
      .map(toTranscriptMessage);

    const transcript: TicketTranscript = {
      fileName: buildTranscriptFileName(options.channel.name, exportedAt),
      content: formatTranscript(
        {
          ticketName: options.channel.name,
          guildName: options.guildName,
          createdBy: options.createdBy,
          closedBy: options.closedBy,
          channelName: options.channel.name,
          exportedAt,
        },
        transcriptMessages,
      ),
      messageCount: transcriptMessages.length,
      exportedAt,
      ticketName: options.channel.name,
      channelName: options.channel.name,
    };

    logTranscriptCreated(
      `file=${transcript.fileName} | messages=${transcript.messageCount}`,
    );

    return transcript;
  } catch (error) {
    logTranscriptFailed(`build failed | channel=${options.channel.name}`, error);
    throw error;
  }
}

function toTranscriptMessage(message: Message<true>): TranscriptMessage {
  return {
    createdAt: message.createdAt,
    authorTag: message.author.tag,
    authorIsBot: message.author.bot,
    content: message.cleanContent || message.content,
    attachmentUrls: [...message.attachments.values()].map((attachment) => {
      return attachment.url;
    }),
  };
}

function buildTranscriptFileName(channelName: string, exportedAt: Date) {
  const datePart = exportedAt.toISOString().slice(0, 10);
  const safeChannelName = channelName
    .normalize("NFKD")
    .replace(/[^\w-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return `${safeChannelName || "ticket"}-${datePart}.txt`;
}
