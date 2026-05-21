import { SlashCommandBuilder } from "discord.js";

export const klarbotCommand = {
  data: new SlashCommandBuilder()
    .setName("klarbot")
    .setDescription("Prueft den Status von KlarBot."),
  async execute() {
    return "KlarBot ist online. KlarApps Systeme bereit.";
  },
};
