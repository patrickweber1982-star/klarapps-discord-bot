import { isKnownFeature } from "../plans/featureFlags.js";
import type { FeatureKey } from "../plans/planTypes.js";
import type { DashboardModuleConfig } from "./types.js";

const dashboardModuleFeatureMap: Record<string, FeatureKey> = {
  "setup-onboarding": "setup",
  "verify-system": "verify",
  "rollen-channels": "rolesPanel",
  ticketsystem: "tickets",
  giveaways: "giveaways",
  moderation: "moderation",
  "creator-tools": "creatorTemplates",
  automationen: "advancedAutomations",
  analytics: "analytics",
  "app-sync": "appSync",
  "ai-tools": "aiTools",
};

export type ModuleSyncDecision = {
  slug: string;
  feature: FeatureKey | null;
  enabledInDashboard: boolean;
  lockedByPlan: boolean;
  shouldApplyLive: false;
  reason: string;
};

export function mapDashboardModuleToFeature(
  module: DashboardModuleConfig,
): FeatureKey | null {
  const mapped = dashboardModuleFeatureMap[module.slug];

  if (mapped && isKnownFeature(mapped)) {
    return mapped;
  }

  if (isKnownFeature(module.slug)) {
    return module.slug;
  }

  return null;
}

export function createModuleSyncDecisions(
  modules: DashboardModuleConfig[],
): ModuleSyncDecision[] {
  return modules.map((module) => ({
    slug: module.slug,
    feature: mapDashboardModuleToFeature(module),
    enabledInDashboard: module.enabled,
    lockedByPlan: module.locked,
    shouldApplyLive: false,
    reason:
      "Dashboard-Modulstatus wird nur gelesen. Live-Aktivierung folgt spaeter kontrolliert.",
  }));
}
