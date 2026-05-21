import type { FeatureFlagDefinition, FeatureKey, PlanId } from "./planTypes.js";

export const FEATURE_FLAGS: Record<FeatureKey, PlanId> = {
  setup: "free",
  verify: "free",
  welcome: "free",
  voice: "free",
  faq: "free",
  help: "free",
  tickets: "basic",
  ticketLogs: "basic",
  transcripts: "basic",
  giveaways: "basic",
  rolesPanel: "basic",
  autoRoles: "basic",
  creatorTemplates: "basic",
  moderation: "basic",
  resetServer: "basic",
  advancedAutomations: "pro",
  appSync: "pro",
  analytics: "pro",
  aiTools: "pro",
  cloudBackup: "pro",
};

export const FEATURE_FLAG_DEFINITIONS: Record<FeatureKey, FeatureFlagDefinition> = {
  setup: { feature: "setup", minimumPlan: "free", label: "Server Setup" },
  verify: { feature: "verify", minimumPlan: "free", label: "Verify System" },
  welcome: { feature: "welcome", minimumPlan: "free", label: "Welcome Flow" },
  voice: { feature: "voice", minimumPlan: "free", label: "Voice Struktur" },
  faq: { feature: "faq", minimumPlan: "free", label: "FAQ System" },
  help: { feature: "help", minimumPlan: "free", label: "Help System" },
  tickets: { feature: "tickets", minimumPlan: "basic", label: "Tickets" },
  ticketLogs: { feature: "ticketLogs", minimumPlan: "basic", label: "Ticket Logs" },
  transcripts: { feature: "transcripts", minimumPlan: "basic", label: "Transcripts" },
  giveaways: { feature: "giveaways", minimumPlan: "basic", label: "Giveaways" },
  rolesPanel: { feature: "rolesPanel", minimumPlan: "basic", label: "Rollenpanel" },
  autoRoles: { feature: "autoRoles", minimumPlan: "basic", label: "Auto Roles" },
  creatorTemplates: { feature: "creatorTemplates", minimumPlan: "basic", label: "Creator Templates" },
  moderation: { feature: "moderation", minimumPlan: "basic", label: "Moderation" },
  resetServer: { feature: "resetServer", minimumPlan: "basic", label: "Server Reset" },
  advancedAutomations: { feature: "advancedAutomations", minimumPlan: "pro", label: "Advanced Automations" },
  appSync: { feature: "appSync", minimumPlan: "pro", label: "App Sync" },
  analytics: { feature: "analytics", minimumPlan: "pro", label: "Analytics" },
  aiTools: { feature: "aiTools", minimumPlan: "pro", label: "AI Tools" },
  cloudBackup: { feature: "cloudBackup", minimumPlan: "pro", label: "Cloud Backup" },
};

export const FEATURE_KEYS = Object.keys(FEATURE_FLAGS) as FeatureKey[];

export function isKnownFeature(value: string): value is FeatureKey {
  return FEATURE_KEYS.includes(value as FeatureKey);
}
