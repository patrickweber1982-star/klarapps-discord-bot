import { logger } from "../../utils/logger.js";

export function logFeatureChecked(message: string) {
  logger.plan(`feature checked | ${message}`);
}

export function logFeatureAllowed(message: string) {
  logger.plan(`feature allowed | ${message}`);
}

export function logFeatureDenied(message: string) {
  logger.plan(`feature denied | ${message}`);
}

export function logUnknownFeature(message: string) {
  logger.plan(`unknown feature | ${message}`);
}

export function logUnknownPlan(message: string) {
  logger.plan(`unknown plan | ${message}`);
}
