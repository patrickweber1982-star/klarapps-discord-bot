import { ChannelType, type CategoryChannel, type Guild } from "discord.js";

import { logCreated, logSkipped } from "./templateLogger.js";
import type { MergedTemplateSetup, TemplateSetupResult } from "./templateTypes.js";

export async function applyTemplateSetup(
  guild: Guild,
  setup: MergedTemplateSetup,
): Promise<TemplateSetupResult> {
  const result: TemplateSetupResult = {
    selectedTemplates: setup.selectedTemplates.map((template) => template.label),
    createdCategories: [],
    skippedCategories: [],
    createdChannels: [],
    skippedChannels: [],
    createdRoles: [],
    skippedRoles: [],
  };

  await guild.roles.fetch();
  await guild.channels.fetch();

  for (const role of setup.roles) {
    const existingRole = guild.roles.cache.find((guildRole) => guildRole.name === role.name);

    if (existingRole) {
      result.skippedRoles.push(role.name);
      logSkipped("role", role.name);
      continue;
    }

    await guild.roles.create({
      name: role.name,
      color: role.color,
      permissions: [],
      reason: "KlarBot Template Setup: Rolle erstellen",
    });

    result.createdRoles.push(role.name);
    logCreated("role", role.name);
  }

  const categories = new Map<string, CategoryChannel>();

  for (const categoryName of setup.categories) {
    const category = await ensureTemplateCategory(guild, categoryName, result);
    categories.set(categoryName, category);
  }

  for (const channel of setup.channels) {
    const category = categories.get(channel.category);

    if (!category) {
      continue;
    }

    if (channel.type === "voice") {
      await ensureTemplateVoiceChannel(guild, category, channel.name, result);
      continue;
    }

    await ensureTemplateTextChannel(guild, category, channel.name, result);
  }

  return result;
}

async function ensureTemplateCategory(
  guild: Guild,
  categoryName: string,
  result: TemplateSetupResult,
) {
  const existingCategory = guild.channels.cache.find(
    (channel): channel is CategoryChannel =>
      channel.type === ChannelType.GuildCategory && channel.name === categoryName,
  );

  if (existingCategory) {
    result.skippedCategories.push(categoryName);
    logSkipped("category", categoryName);
    return existingCategory;
  }

  const category = await guild.channels.create({
    name: categoryName,
    type: ChannelType.GuildCategory,
    reason: "KlarBot Template Setup: Kategorie erstellen",
  });

  result.createdCategories.push(categoryName);
  logCreated("category", categoryName);

  return category;
}

async function ensureTemplateTextChannel(
  guild: Guild,
  category: CategoryChannel,
  channelName: string,
  result: TemplateSetupResult,
) {
  const existingChannel = guild.channels.cache.find((channel) => {
    return channel.type === ChannelType.GuildText && channel.name === channelName;
  });

  if (existingChannel) {
    result.skippedChannels.push(channelName);
    logSkipped("channel", channelName);
    return;
  }

  await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: category.id,
    reason: "KlarBot Template Setup: Textchannel erstellen",
  });

  result.createdChannels.push(channelName);
  logCreated("channel", channelName);
}

async function ensureTemplateVoiceChannel(
  guild: Guild,
  category: CategoryChannel,
  channelName: string,
  result: TemplateSetupResult,
) {
  const existingChannel = guild.channels.cache.find((channel) => {
    return channel.type === ChannelType.GuildVoice && channel.name === channelName;
  });

  if (existingChannel) {
    result.skippedChannels.push(channelName);
    logSkipped("channel", channelName);
    return;
  }

  await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildVoice,
    parent: category.id,
    reason: "KlarBot Template Setup: Voicechannel erstellen",
  });

  result.createdChannels.push(channelName);
  logCreated("channel", channelName);
}
