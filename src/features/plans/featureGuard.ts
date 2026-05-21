import { warningEmbed } from "../../utils/embeds.js";
import {
  FEATURE_FLAG_DEFINITIONS,
  FEATURE_FLAGS,
  isKnownFeature,
} from "./featureFlags.js";
import {
  isKnownPlan,
  PLAN_ORDER,
} from "./planConfig.js";
import {
  logFeatureAllowed,
  logFeatureChecked,
  logFeatureDenied,
  logUnknownFeature,
  logUnknownPlan,
} from "./planLogger.js";
import type { FeatureKey, PlanId } from "./planTypes.js";

export function canUseFeature(planInput: string, featureInput: string) {
  logFeatureChecked(`plan=${planInput} | feature=${featureInput}`);

  if (!isKnownPlan(planInput)) {
    logUnknownPlan(`plan=${planInput} | feature=${featureInput}`);
    return false;
  }

  if (!isKnownFeature(featureInput)) {
    logUnknownFeature(`plan=${planInput} | feature=${featureInput}`);
    return false;
  }

  const minimumPlan = FEATURE_FLAGS[featureInput];
  const allowed = PLAN_ORDER[planInput] >= PLAN_ORDER[minimumPlan];

  if (allowed) {
    logFeatureAllowed(`plan=${planInput} | feature=${featureInput}`);
  } else {
    logFeatureDenied(`plan=${planInput} | feature=${featureInput} | required=${minimumPlan}`);
  }

  return allowed;
}

export function getRequiredPlan(feature: FeatureKey) {
  return FEATURE_FLAGS[feature];
}

export function buildFeatureUnavailableEmbed(feature: FeatureKey, plan: PlanId) {
  const definition = FEATURE_FLAG_DEFINITIONS[feature];
  const requiredPlan = definition.minimumPlan.toUpperCase();

  return warningEmbed(
    [
      `**Feature:** ${definition.label}`,
      `**Aktueller Plan:** ${plan.toUpperCase()}`,
      `**Benötigt:** ${requiredPlan}`,
      "",
      "Dieses Feature ist technisch vorbereitet, aber fuer diesen Plan nicht aktiv.",
    ].join("\n"),
    requiredPlan === "PRO"
      ? "🚀 Dieses Feature ist nur in PRO verfügbar"
      : "Dieses Feature benötigt BASIC",
  );
}
