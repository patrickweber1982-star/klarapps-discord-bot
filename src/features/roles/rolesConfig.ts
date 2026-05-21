import type { SelfAssignableRole } from "./types.js";

export const SELF_ASSIGNABLE_ROLES = [
  {
    id: "role_youtube",
    label: "🎥 YouTube",
    roleName: "🎥 YouTube",
    category: "platforms",
  },
  {
    id: "role_twitch",
    label: "🟣 Twitch",
    roleName: "🟣 Twitch",
    category: "platforms",
  },
  {
    id: "role_tiktok",
    label: "🎵 TikTok",
    roleName: "🎵 TikTok",
    category: "platforms",
  },
  {
    id: "role_gaming",
    label: "🎮 Gaming",
    roleName: "🎮 Gaming",
    category: "interests",
  },
  {
    id: "role_dev",
    label: "💻 Development",
    roleName: "💻 Development",
    category: "interests",
  },
  {
    id: "role_design",
    label: "🎨 Design",
    roleName: "🎨 Design",
    category: "interests",
  },
  {
    id: "role_updates",
    label: "🔔 Updates",
    roleName: "🔔 Updates",
    category: "notifications",
  },
  {
    id: "role_giveaways",
    label: "🎉 Giveaways",
    roleName: "🎉 Giveaways",
    category: "notifications",
  },
  {
    id: "role_events",
    label: "📢 Events",
    roleName: "📢 Events",
    category: "notifications",
  },
] as const satisfies readonly SelfAssignableRole[];

export const SELF_ASSIGNABLE_ROLE_IDS = SELF_ASSIGNABLE_ROLES.map((role) => role.id);

export function getSelfAssignableRoleById(customId: string) {
  return SELF_ASSIGNABLE_ROLES.find((role) => role.id === customId) ?? null;
}

export function getSelfAssignableRolesByCategory(category: SelfAssignableRole["category"]) {
  return SELF_ASSIGNABLE_ROLES.filter((role) => role.category === category);
}
