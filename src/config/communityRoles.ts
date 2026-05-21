export type CommunityRoleKey = "creator" | "coding" | "gaming" | "beta" | "updates";

export type CommunityRoleDefinition = {
  key: CommunityRoleKey;
  buttonId: string;
  buttonLabel: string;
  name: string;
  color: number;
  description: string;
  hoist?: boolean;
};

export const communityRoleDefinitions: Record<CommunityRoleKey, CommunityRoleDefinition> = {
  creator: {
    key: "creator",
    buttonId: "role_creator",
    buttonLabel: "🎬 Creator",
    name: "🎬 Creator",
    color: 0xec4899,
    description: "Content, Streams, Videos und Creator-Austausch.",
    hoist: true,
  },
  coding: {
    key: "coding",
    buttonId: "role_coding",
    buttonLabel: "💻 Coding",
    name: "💻 Coding",
    color: 0x0ea5e9,
    description: "Entwicklung, Tools, Technik und Projektideen.",
  },
  gaming: {
    key: "gaming",
    buttonId: "role_gaming",
    buttonLabel: "🎮 Gaming",
    name: "🎮 Gaming",
    color: 0x22c55e,
    description: "Gaming, Community-Abende und lockere Runden.",
  },
  beta: {
    key: "beta",
    buttonId: "role_beta",
    buttonLabel: "🧪 Beta Tester",
    name: "🧪 Beta Tester",
    color: 0x3498db,
    description: "Beta-Hinweise und frühe Tests.",
  },
  updates: {
    key: "updates",
    buttonId: "role_updates",
    buttonLabel: "📢 Updates",
    name: "📢 Updates",
    color: 0xf59e0b,
    description: "Ankündigungen, Produktnews und wichtige Community-Updates.",
  },
};

export const communityRoleList = Object.values(communityRoleDefinitions);
export const communityRoleButtonIds = communityRoleList.map((role) => role.buttonId);
