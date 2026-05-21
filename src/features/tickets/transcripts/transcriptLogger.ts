import { logger } from "../../../utils/logger.js";

export function logTranscriptStarted(message: string) {
  logger.transcript(`transcript started | ${message}`);
}

export function logTranscriptCreated(message: string) {
  logger.transcript(`transcript created | ${message}`);
}

export function logTranscriptUploaded(message: string) {
  logger.transcript(`transcript uploaded | ${message}`);
}

export function logTranscriptFailed(message: string, error?: unknown) {
  logger.transcript(`transcript failed | ${message}`, error);
}
