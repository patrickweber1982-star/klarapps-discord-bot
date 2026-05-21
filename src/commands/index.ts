import { clearCommand } from "./clear.js";
import { creatorPanelCommand } from "./creator-panel.js";
import { helpCommand } from "./help.js";
import { kickCommand } from "./kick.js";
import { klarbotCommand } from "./klarbot.js";
import { rolesCommand } from "./roles.js";
import { setupCommand } from "./setup.js";
import { ticketsCommand } from "./tickets.js";
import { timeoutCommand } from "./timeout.js";
import { verifyCommand } from "./verify.js";
import type { BotCommand } from "../types/command.js";

export const commandList = [
  klarbotCommand,
  setupCommand,
  helpCommand,
  verifyCommand,
  ticketsCommand,
  creatorPanelCommand,
  rolesCommand,
  clearCommand,
  timeoutCommand,
  kickCommand,
] satisfies BotCommand[];

export function createCommandMap(commands: BotCommand[] = commandList) {
  return new Map(commands.map((command) => [command.name, command]));
}

export function getCommandPayloads(commands: BotCommand[] = commandList) {
  return commands.map((command) => command.data.toJSON());
}
