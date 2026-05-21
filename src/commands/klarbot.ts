import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "../types/command.js";

export const klarbotCommandName = "klarbot" as const;

export const klarbotCommand: BotCommand = {
  name: klarbotCommandName,
  data: new SlashCommandBuilder()
    .setName(klarbotCommandName)
    .setDescription("Prueft den Status von KlarBot."),
  async execute({ interaction }) {
    await interaction.reply({
      content: "KlarBot ist online. KlarApps Systeme bereit.",
      ephemeral: true,
    });
  },
};
