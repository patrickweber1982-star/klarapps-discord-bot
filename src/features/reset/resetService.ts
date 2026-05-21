import {
  ChannelType,
  type Guild,
  type GuildBasedChannel,
  type Role,
} from "discord.js";

import {
  KNOWN_KLARBOT_CATEGORIES,
  KNOWN_KLARBOT_CHANNELS,
  KNOWN_KLARBOT_ROLES,
  KNOWN_TICKET_TOPIC_PREFIX,
} from "./resetConfig.js";
import {
  logDeletedCategory,
  logDeletedChannel,
  logDeletedRole,
  logResetCompleted,
  logResetFailed,
  logResetStarted,
  logSkippedProtectedEntity,
} from "./resetLogger.js";

export type ResetResult = {
  deletedChannels: string[];
  deletedVoiceChannels: string[];
  deletedCategories: string[];
  deletedRoles: string[];
  skipped: string[];
};

type ResetOptions = {
  guild: Guild;
  interactionChannelId?: string | null;
};

export async function resetKlarBotServer(options: ResetOptions): Promise<ResetResult> {
  const result: ResetResult = {
    deletedChannels: [],
    deletedVoiceChannels: [],
    deletedCategories: [],
    deletedRoles: [],
    skipped: [],
  };

  logResetStarted(`guild=${options.guild.name}`);

  await options.guild.channels.fetch();
  await options.guild.roles.fetch();

  const knownChannels = [...getKnownChannels(options.guild).values()];
  const currentChannel = options.interactionChannelId
    ? knownChannels.find((channel) => channel.id === options.interactionChannelId)
    : null;
  const channelsToDelete = knownChannels.filter((channel) => channel.id !== options.interactionChannelId);

  await deleteChannelsByType(channelsToDelete, [ChannelType.GuildText], result, "text");
  await deleteChannelsByType(channelsToDelete, [ChannelType.GuildVoice], result, "voice");

  if (currentChannel) {
    skip(result, `Command-Channel nicht geloescht: #${currentChannel.name}`);
  }

  await deleteCategories(options.guild, result);
  await deleteRoles(options.guild, result);

  logResetCompleted(
    `guild=${options.guild.name} | channels=${result.deletedChannels.length + result.deletedVoiceChannels.length} | categories=${result.deletedCategories.length} | roles=${result.deletedRoles.length}`,
  );

  return result;
}

function getKnownChannels(guild: Guild) {
  return guild.channels.cache.filter((channel) => {
    if (channel.type === ChannelType.GuildCategory) {
      return false;
    }

    if ("topic" in channel && channel.topic?.startsWith(KNOWN_TICKET_TOPIC_PREFIX)) {
      return true;
    }

    return KNOWN_KLARBOT_CHANNELS.includes(channel.name);
  });
}

async function deleteChannelsByType(
  channels: GuildBasedChannel[],
  channelTypes: ChannelType[],
  result: ResetResult,
  type: "text" | "voice",
) {
  for (const channel of channels.values()) {
    if (!channelTypes.includes(channel.type)) {
      continue;
    }

    await channel.delete("KlarBot Reset: bekannter KlarBot Channel").then(() => {
      if (type === "voice") {
        result.deletedVoiceChannels.push(channel.name);
      } else {
        result.deletedChannels.push(channel.name);
      }

      logDeletedChannel(`name=${channel.name}`);
    }).catch((error) => {
      logResetFailed(`channel delete failed | name=${channel.name}`, error);
      skip(result, `Channel Fehler: #${channel.name}`);
    });
  }
}

async function deleteCategories(guild: Guild, result: ResetResult) {
  for (const categoryName of KNOWN_KLARBOT_CATEGORIES) {
    const categories = guild.channels.cache.filter((channel) => {
      return channel.type === ChannelType.GuildCategory && channel.name === categoryName;
    });

    for (const category of categories.values()) {
      await category.delete("KlarBot Reset: bekannte KlarBot Kategorie").then(() => {
        result.deletedCategories.push(category.name);
        logDeletedCategory(`name=${category.name}`);
      }).catch((error) => {
        logResetFailed(`category delete failed | name=${category.name}`, error);
        skip(result, `Kategorie Fehler: ${category.name}`);
      });

    }
  }
}

async function deleteRoles(guild: Guild, result: ResetResult) {
  const roles = KNOWN_KLARBOT_ROLES
    .flatMap((roleName) => {
      return [...guild.roles.cache.filter((role) => role.name === roleName).values()];
    });

  for (const role of roles) {
    if (role.id === guild.roles.everyone.id || role.managed) {
      skip(result, `Geschuetzte Rolle uebersprungen: ${role.name}`);
      continue;
    }

    if (!role.editable) {
      skip(result, `Rolle nicht loeschbar: ${role.name}`);
      continue;
    }

    await role.delete("KlarBot Reset: bekannte KlarBot Rolle").then(() => {
      result.deletedRoles.push(role.name);
      logDeletedRole(`name=${role.name}`);
    }).catch((error) => {
      logResetFailed(`role delete failed | name=${role.name}`, error);
      skip(result, `Rollen Fehler: ${role.name}`);
    });
  }
}

function skip(result: ResetResult, message: string) {
  result.skipped.push(message);
  logSkippedProtectedEntity(message);
}
