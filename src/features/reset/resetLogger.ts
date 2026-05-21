import { logger } from "../../utils/logger.js";

export function logResetStarted(message: string) {
  logger.reset(`reset started | ${message}`);
}

export function logDeletedChannel(message: string) {
  logger.reset(`deleted channel | ${message}`);
}

export function logDeletedCategory(message: string) {
  logger.reset(`deleted category | ${message}`);
}

export function logDeletedRole(message: string) {
  logger.reset(`deleted role | ${message}`);
}

export function logSkippedProtectedEntity(message: string) {
  logger.reset(`skipped protected entity | ${message}`);
}

export function logResetCompleted(message: string) {
  logger.reset(`reset completed | ${message}`);
}

export function logResetFailed(message: string, error?: unknown) {
  logger.reset(`reset failed | ${message}`, error);
}
