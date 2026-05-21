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
  hoist?: boolean;
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
    hoist: true,
  },
  betaTester: {
    key: "betaTester",
    name: "🧪 Beta Tester",
    color: 0x3498db,
    permissions: [],
    hoist: true,
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
  { name: "👑 Founder", color: 0xf5c542, permissions: [], hoist: true },
  { name: "🛠️ Developer", color: 0x5865f2, permissions: [], hoist: true },
  { name: "🤝 Moderator", color: 0x57f287, permissions: [], hoist: true },
  managedRoles.proCustomer,
  managedRoles.betaTester,
  managedRoles.rulesAccepted,
  managedRoles.community,
] as const;

export const ticketStaffRoleNames = ["👑 Founder", "🛠️ Developer", "🤝 Moderator"] as const;

export const moderationRoleNames = ticketStaffRoleNames;
