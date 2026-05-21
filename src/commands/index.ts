import { helpCommand } from "./help.js";
import { klarbotCommand } from "./klarbot.js";
import { setupCommand } from "./setup.js";
import { verifyCommand } from "./verify.js";
import type { BotCommand } from "../types/command.js";

export const commandList = [
  klarbotCommand,
  setupCommand,
  helpCommand,
  verifyCommand,
] satisfies BotCommand[];

export function createCommandMap(commands: BotCommand[] = commandList) {
  return new Map(commands.map((command) => [command.name, command]));
}

export function getCommandPayloads(commands: BotCommand[] = commandList) {
  return commands.map((command) => command.data.toJSON());
}
