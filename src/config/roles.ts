import { PermissionFlagsBits } from "discord.js";

export type ManagedRoleKey = "community" | "pro" | "beta" | "customer" | "license";

export type ManagedRoleDefinition = {
  key: ManagedRoleKey;
  name: string;
  color: number;
  permissions: bigint[];
};

export const managedRoles: Record<ManagedRoleKey, ManagedRoleDefinition> = {
  community: {
    key: "community",
    name: "👤 Community",
    color: 0x95a5a6,
    permissions: [],
  },
  pro: {
    key: "pro",
    name: "💎 Pro",
    color: 0x9b59b6,
    permissions: [],
  },
  beta: {
    key: "beta",
    name: "🧪 Beta",
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
  managedRoles.pro,
  managedRoles.community,
] as const;

export const ticketStaffRoleNames = ["👑 Founder", "🛠️ Developer", "🤝 Moderator"] as const;
