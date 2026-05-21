import { ChannelType, type Guild, type User } from "discord.js";

import { moderationLogChannelName } from "../config/channels.js";
import { moderationEmbed } from "./embeds.js";
import { logger } from "./logger.js";

type ModerationLogOptions = {
  guild: Guild;
  action: string;
  moderator: User;
  target?: User;
  reason?: string | null;
  details?: string;
};

export async function logModerationAction(options: ModerationLogOptions) {
  const message = [
    `Aktion: ${options.action}`,
    `Moderator: ${options.moderator.tag}`,
    options.target ? `Ziel: ${options.target.tag}` : null,
    options.reason ? `Grund: ${options.reason}` : null,
    options.details ?? null,
  ]
    .filter(Boolean)
    .join(" | ");

  logger.moderation(message);

  await options.guild.channels.fetch();

  const logChannel = options.guild.channels.cache.find((channel) => {
    return channel.type === ChannelType.GuildText && channel.name === moderationLogChannelName;
  });

  if (!logChannel || logChannel.type !== ChannelType.GuildText) {
    return;
  }

  await logChannel.send({
    embeds: [
      moderationEmbed(
        [
          `**Aktion:** ${options.action}`,
          `**Moderator:** ${options.moderator}`,
          options.target ? `**Nutzer:** ${options.target}` : null,
          options.reason ? `**Grund:** ${options.reason}` : null,
          options.details ? `**Details:** ${options.details}` : null,
        ]
          .filter(Boolean)
        .join("\n"),
      ),
    ],
  }).catch((error) => {
    logger.warn("Moderationslog konnte nicht in Discord geschrieben werden", error);
  });
}
