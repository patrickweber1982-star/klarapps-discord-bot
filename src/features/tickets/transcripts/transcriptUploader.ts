import {
  AttachmentBuilder,
  ChannelType,
  PermissionFlagsBits,
  type Guild,
  type TextChannel,
  type User,
} from "discord.js";

import { ticketLogChannelName } from "../../../config/channels.js";
import { successEmbed } from "../../../utils/embeds.js";
import type { TicketTranscript } from "./transcriptBuilder.js";
import {
  logTranscriptFailed,
  logTranscriptUploaded,
} from "./transcriptLogger.js";

type UploadTicketTranscriptOptions = {
  guild: Guild;
  transcript: TicketTranscript;
  ticketUser?: User | null;
  closedBy: User;
};

export async function uploadTicketTranscript(
  options: UploadTicketTranscriptOptions,
) {
  const logChannel = await findTicketLogChannel(options.guild);

  if (!logChannel) {
    logTranscriptFailed(
      `ticket log channel missing | guild=${options.guild.name}`,
    );
    return false;
  }

  const botMember = options.guild.members.me
    ?? (await options.guild.members.fetchMe().catch(() => null));
  const permissions = botMember ? logChannel.permissionsFor(botMember) : null;

  if (
    !permissions?.has(PermissionFlagsBits.SendMessages) ||
    !permissions.has(PermissionFlagsBits.EmbedLinks) ||
    !permissions.has(PermissionFlagsBits.AttachFiles)
  ) {
    logTranscriptFailed(
      `missing permissions | channel=${logChannel.name} | guild=${options.guild.name}`,
    );
    return false;
  }

  const attachment = new AttachmentBuilder(
    Buffer.from(options.transcript.content, "utf8"),
    { name: options.transcript.fileName },
  );

  try {
    await logChannel.send({
      embeds: [
        buildTranscriptUploadedEmbed({
          transcript: options.transcript,
          ticketUser: options.ticketUser,
          closedBy: options.closedBy,
        }),
      ],
      files: [attachment],
    });

    logTranscriptUploaded(
      `file=${options.transcript.fileName} | channel=${logChannel.name} | guild=${options.guild.name}`,
    );
    return true;
  } catch (error) {
    logTranscriptFailed(
      `upload failed | file=${options.transcript.fileName} | channel=${logChannel.name}`,
      error,
    );
    return false;
  }
}

function buildTranscriptUploadedEmbed(options: {
  transcript: TicketTranscript;
  ticketUser?: User | null;
  closedBy: User;
}) {
  return successEmbed(
    [
      `**Ticket:** #${options.transcript.ticketName}`,
      `**User:** ${options.ticketUser ?? "Unbekannt"}`,
      `**Geschlossen von:** ${options.closedBy}`,
      `**Nachrichtenanzahl:** ${options.transcript.messageCount}`,
      `**Exportzeit:** <t:${toUnixTimestamp(options.transcript.exportedAt)}:F>`,
      "",
      "**Status:** Transcript als Markdown-Datei erstellt.",
    ].join("\n"),
    "📝 Ticket Transcript erstellt",
  );
}

async function findTicketLogChannel(guild: Guild) {
  await guild.channels.fetch().catch(() => null);

  const channel = guild.channels.cache.find((currentChannel): currentChannel is TextChannel => {
    return currentChannel.type === ChannelType.GuildText && currentChannel.name === ticketLogChannelName;
  });

  return channel ?? null;
}

function toUnixTimestamp(date: Date) {
  return Math.floor(date.getTime() / 1000);
}
