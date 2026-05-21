import { logger } from "../../utils/logger.js";

export function logFaqOpened(message: string) {
  logger.faq(`faq opened | ${message}`);
}

export function logFaqTopicSelected(message: string) {
  logger.faq(`faq topic selected | ${message}`);
}

export function logFaqInvalidTopic(message: string) {
  logger.faq(`faq invalid topic | ${message}`);
}

export function logFaqEmbedSent(message: string) {
  logger.faq(`faq embed sent | ${message}`);
}
