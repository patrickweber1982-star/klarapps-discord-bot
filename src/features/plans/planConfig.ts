import type { FeatureKey, PlanId } from "./planTypes.js";

export const DEFAULT_PLAN: PlanId = "basic";

export const PLAN_ORDER: Record<PlanId, number> = {
  free: 0,
  basic: 1,
  pro: 2,
};

export const PLAN_FEATURES: Record<PlanId, FeatureKey[]> = {
  free: [
    "setup",
    "verify",
    "welcome",
    "voice",
    "faq",
    "help",
  ],
  basic: [
    "setup",
    "verify",
    "welcome",
    "voice",
    "faq",
    "help",
    "tickets",
    "ticketLogs",
    "transcripts",
    "giveaways",
    "rolesPanel",
    "autoRoles",
    "creatorTemplates",
    "moderation",
    "resetServer",
  ],
  pro: [
    "setup",
    "verify",
    "welcome",
    "voice",
    "faq",
    "help",
    "tickets",
    "ticketLogs",
    "transcripts",
    "giveaways",
    "rolesPanel",
    "autoRoles",
    "creatorTemplates",
    "moderation",
    "resetServer",
    "advancedAutomations",
    "appSync",
    "analytics",
    "aiTools",
    "cloudBackup",
  ],
};

export const PLAN_IDS = Object.keys(PLAN_ORDER) as PlanId[];

export function isKnownPlan(value: string): value is PlanId {
  return PLAN_IDS.includes(value as PlanId);
}
