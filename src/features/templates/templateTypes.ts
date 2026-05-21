export type TemplateKey = "twitch" | "youtube" | "indiedev" | "support";

export type TemplateChannelType = "text" | "voice";

export type TemplateChannelDefinition = {
  name: string;
  category: string;
  type?: TemplateChannelType;
};

export type TemplateRoleDefinition = {
  name: string;
  color: number;
};

export type CreatorTemplateDefinition = {
  key: TemplateKey;
  label: string;
  categories: string[];
  channels: TemplateChannelDefinition[];
  roles: TemplateRoleDefinition[];
};

export type MergedTemplateSetup = {
  selectedTemplates: CreatorTemplateDefinition[];
  categories: string[];
  channels: TemplateChannelDefinition[];
  roles: TemplateRoleDefinition[];
};

export type TemplateSetupResult = {
  selectedTemplates: string[];
  createdCategories: string[];
  skippedCategories: string[];
  createdChannels: string[];
  skippedChannels: string[];
  createdRoles: string[];
  skippedRoles: string[];
};
