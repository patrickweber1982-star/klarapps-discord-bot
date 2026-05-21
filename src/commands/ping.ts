import { SlashCommandBuilder } from "discord.js";

export const pingCommand = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Prueft, ob der KlarApps Bot online ist."),
  async execute() {
    return "KlarApps Bot online";
  },
};
