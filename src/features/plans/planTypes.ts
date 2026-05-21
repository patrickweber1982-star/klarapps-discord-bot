export type PlanId = "free" | "basic" | "pro";

export type FeatureKey =
  | "setup"
  | "verify"
  | "welcome"
  | "voice"
  | "faq"
  | "help"
  | "tickets"
  | "ticketLogs"
  | "transcripts"
  | "giveaways"
  | "rolesPanel"
  | "autoRoles"
  | "creatorTemplates"
  | "moderation"
  | "resetServer"
  | "advancedAutomations"
  | "appSync"
  | "analytics"
  | "aiTools"
  | "cloudBackup";

export type FeatureFlagDefinition = {
  feature: FeatureKey;
  minimumPlan: PlanId;
  label: string;
};
