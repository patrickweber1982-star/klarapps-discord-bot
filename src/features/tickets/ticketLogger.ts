import { logger } from "../../utils/logger.js";

export function logTicketCreated(message: string) {
  logger.ticketLog(`ticket created | ${message}`);
}

export function logTicketClosed(message: string) {
  logger.ticketLog(`ticket closed | ${message}`);
}

export function logTicketLogSent(message: string) {
  logger.ticketLog(`ticket log sent | ${message}`);
}

export function logTicketLogChannelMissing(guildName: string) {
  logger.ticketLog(`ticket log channel missing | guild=${guildName}`);
}

export function logTicketLogFailed(message: string, error?: unknown) {
  logger.ticketLog(`ticket log failed | ${message}`, error);
}

export function logTicketError(message: string, error?: unknown) {
  logger.ticketLog(`ticket error | ${message}`, error);
}
