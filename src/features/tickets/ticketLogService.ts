import {
  ChannelType,
  PermissionFlagsBits,
  type Guild,
  type GuildMember,
  type TextBasedChannel,
  type TextChannel,
  type User,
} from "discord.js";

import { ticketLogChannelName } from "../../config/channels.js";
import {
  buildTicketClosedLogEmbed,
  buildTicketCreatedLogEmbed,
  buildTicketErrorLogEmbed,
} from "./ticketLogEmbeds.js";
import {
  logTicketClosed,
  logTicketCreated,
  logTicketError,
  logTicketLogChannelMissing,
  logTicketLogFailed,
  logTicketLogSent,
} from "./ticketLogger.js";

type TicketCreatedLogOptions = {
  guild: Guild;
  user: User;
  ticketChannel: TextBasedChannel;
  ticketType?: string;
};

type TicketClosedLogOptions = {
  guild: Guild;
  user?: User | null;
  closedBy: User;
  ticketChannelName: string;
  reason?: string;
};

type TicketErrorLogOptions = {
  guild?: Guild | null;
  action: string;
  errorReason: string;
  user?: User | null;
  channel?: TextBasedChannel | null;
};

export async function logTicketCreatedEvent(options: TicketCreatedLogOptions) {
  logTicketCreated(
    `user=${options.user.tag} | channel=${"name" in options.ticketChannel ? options.ticketChannel.name : "unknown"} | guild=${options.guild.name}`,
  );

  await sendTicketLog(options.guild, {
    embeds: [buildTicketCreatedLogEmbed(options)],
  });
}

export async function logTicketClosedEvent(options: TicketClosedLogOptions) {
  logTicketClosed(
    `closedBy=${options.closedBy.tag} | channel=${options.ticketChannelName} | guild=${options.guild.name}`,
  );

  await sendTicketLog(options.guild, {
    embeds: [buildTicketClosedLogEmbed(options)],
  });
}

export async function logTicketErrorEvent(options: TicketErrorLogOptions) {
  const channelName = options.channel && "name" in options.channel ? options.channel.name : null;
  logTicketError(
    `action=${options.action} | reason=${options.errorReason} | user=${options.user?.tag ?? "unknown"} | channel=${channelName ?? "unknown"}`,
  );

  if (!options.guild) {
    return;
  }

  await sendTicketLog(options.guild, {
    embeds: [
      buildTicketErrorLogEmbed({
        action: options.action,
        errorReason: options.errorReason,
        user: options.user,
        channelName,
        guild: options.guild,
      }),
    ],
  });
}

async function sendTicketLog(
  guild: Guild,
  payload: Parameters<TextChannel["send"]>[0],
) {
  const logChannel = await findTicketLogChannel(guild);

  if (!logChannel) {
    logTicketLogChannelMissing(guild.name);
    return;
  }

  const botMember = guild.members.me ?? (await guild.members.fetchMe().catch(() => null));
  const permissions = botMember ? logChannel.permissionsFor(botMember as GuildMember) : null;

  if (
    !permissions?.has(PermissionFlagsBits.SendMessages) ||
    !permissions.has(PermissionFlagsBits.EmbedLinks)
  ) {
    logTicketLogFailed(
      `missing permissions | channel=${logChannel.name} | guild=${guild.name}`,
    );
    return;
  }

  await logChannel
    .send(payload)
    .then(() => {
      logTicketLogSent(`channel=${logChannel.name} | guild=${guild.name}`);
    })
    .catch((error) => {
      logTicketLogFailed(`discord api error | channel=${logChannel.name}`, error);
    });
}

async function findTicketLogChannel(guild: Guild) {
  await guild.channels.fetch().catch(() => null);

  const channel = guild.channels.cache.find((currentChannel): currentChannel is TextChannel => {
    return currentChannel.type === ChannelType.GuildText && currentChannel.name === ticketLogChannelName;
  });

  return channel ?? null;
}
