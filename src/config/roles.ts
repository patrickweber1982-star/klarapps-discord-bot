import { PermissionFlagsBits } from "discord.js";

export type ManagedRoleKey =
  | "rulesAccepted"
  | "community"
  | "proCustomer"
  | "betaTester"
  | "customer"
  | "license";

export type ManagedRoleDefinition = {
  key: ManagedRoleKey;
  name: string;
  color: number;
  permissions: bigint[];
};

export const managedRoles: Record<ManagedRoleKey, ManagedRoleDefinition> = {
  rulesAccepted: {
    key: "rulesAccepted",
    name: "📘 Regeln akzeptiert",
    color: 0x3498db,
    permissions: [],
  },
  community: {
    key: "community",
    name: "👤 Community",
    color: 0x95a5a6,
    permissions: [],
  },
  proCustomer: {
    key: "proCustomer",
    name: "💎 Pro Kunde",
    color: 0x9b59b6,
    permissions: [],
  },
  betaTester: {
    key: "betaTester",
    name: "🧪 Beta Tester",
    color: 0x3498db,
    permissions: [],
  },
  customer: {
    key: "customer",
    name: "🤝 Kunde",
    color: 0x2ecc71,
    permissions: [],
  },
  license: {
    key: "license",
    name: "🔑 Lizenz",
    color: 0xf1c40f,
    permissions: [],
  },
};

export const setupRoleDefinitions = [
  { name: "👑 Founder", color: 0xf5c542, permissions: [PermissionFlagsBits.Administrator] },
  { name: "🛠️ Developer", color: 0x5865f2, permissions: [PermissionFlagsBits.ManageGuild] },
  { name: "🤝 Moderator", color: 0x57f287, permissions: [PermissionFlagsBits.ManageMessages] },
  managedRoles.proCustomer,
  managedRoles.betaTester,
  managedRoles.rulesAccepted,
  managedRoles.community,
] as const;

export const ticketStaffRoleNames = ["👑 Founder", "🛠️ Developer", "🤝 Moderator"] as const;

export const moderationRoleNames = ticketStaffRoleNames;
