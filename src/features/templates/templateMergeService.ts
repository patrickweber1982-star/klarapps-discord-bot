import {
  availableTemplateKeys,
  creatorTemplates,
} from "./templateConfig.js";
import { logTemplateSelected, logTemplatesMerged } from "./templateLogger.js";
import type {
  CreatorTemplateDefinition,
  MergedTemplateSetup,
  TemplateChannelDefinition,
  TemplateKey,
  TemplateRoleDefinition,
} from "./templateTypes.js";

export function parseTemplateCsv(input: string) {
  const rawKeys = input
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  const uniqueKeys = [...new Set(rawKeys)];
  const invalidKeys = uniqueKeys.filter((key) => !isTemplateKey(key));

  if (invalidKeys.length > 0) {
    return {
      ok: false as const,
      invalidKeys,
      keys: [] as TemplateKey[],
    };
  }

  return {
    ok: true as const,
    invalidKeys: [] as string[],
    keys: uniqueKeys as TemplateKey[],
  };
}

export function mergeTemplates(keys: TemplateKey[]): MergedTemplateSetup {
  const selectedTemplates = keys.map((key) => {
    logTemplateSelected(key);
    return creatorTemplates[key];
  });

  logTemplatesMerged(keys);

  return {
    selectedTemplates,
    categories: mergeCategories(selectedTemplates),
    channels: mergeChannels(selectedTemplates),
    roles: mergeRoles(selectedTemplates),
  };
}

export function getAvailableTemplateText() {
  return availableTemplateKeys.join(", ");
}

function mergeCategories(templates: CreatorTemplateDefinition[]) {
  return [...new Set(templates.flatMap((template) => template.categories))];
}

function mergeChannels(templates: CreatorTemplateDefinition[]) {
  const channels = new Map<string, TemplateChannelDefinition>();

  for (const template of templates) {
    for (const channel of template.channels) {
      if (!channels.has(channel.name)) {
        channels.set(channel.name, channel);
      }
    }
  }

  return [...channels.values()];
}

function mergeRoles(templates: CreatorTemplateDefinition[]) {
  const roles = new Map<string, TemplateRoleDefinition>();

  for (const template of templates) {
    for (const role of template.roles) {
      if (!roles.has(role.name)) {
        roles.set(role.name, role);
      }
    }
  }

  return [...roles.values()];
}

function isTemplateKey(value: string): value is TemplateKey {
  return availableTemplateKeys.includes(value as TemplateKey);
}
