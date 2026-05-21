import { setupCategoryDefinitions } from "../../config/channels.js";
import { communityRoleList } from "../../config/communityRoles.js";
import { managedRoles, setupRoleDefinitions } from "../../config/roles.js";
import { ticketTopicPrefix } from "../../config/tickets.js";
import { SELF_ASSIGNABLE_ROLES } from "../roles/rolesConfig.js";
import { creatorTemplates } from "../templates/templateConfig.js";

const setupCategories = setupCategoryDefinitions.map((category) => category.name);
const setupChannels = setupCategoryDefinitions.flatMap((category) =>
  category.channels.map((channel) => channel.name),
);
const templateDefinitions = Object.values(creatorTemplates);
const templateCategories = templateDefinitions.flatMap((template) => template.categories);
const templateChannels = templateDefinitions.flatMap((template) =>
  template.channels.map((channel) => channel.name),
);
const templateRoles = templateDefinitions.flatMap((template) =>
  template.roles.map((role) => role.name),
);

export const KNOWN_KLARBOT_CATEGORIES = unique([
  ...setupCategories,
  ...templateCategories,
]);

export const KNOWN_KLARBOT_CHANNELS = unique([
  ...setupChannels,
  ...templateChannels,
]);

export const KNOWN_KLARBOT_ROLES = unique([
  ...setupRoleDefinitions.map((role) => role.name),
  ...Object.values(managedRoles).map((role) => role.name),
  ...communityRoleList.map((role) => role.name),
  ...SELF_ASSIGNABLE_ROLES.map((role) => role.roleName),
  ...templateRoles,
]);

export const KNOWN_TICKET_TOPIC_PREFIX = ticketTopicPrefix;

function unique(values: string[]) {
  return [...new Set(values)];
}
