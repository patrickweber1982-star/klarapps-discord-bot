import { Client, Events, GatewayIntentBits } from "discord.js";
import "dotenv/config";
import { pingCommand } from "./commands/ping.js";

const token = process.env.DISCORD_BOT_TOKEN;

if (!token) {
  throw new Error("DISCORD_BOT_TOKEN fehlt. Lege eine .env-Datei im discord-bot-Ordner an.");
}

const commands = new Map([[pingCommand.data.name, pingCommand]]);

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`KlarApps Discord Bot ist online als ${readyClient.user.tag}.`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  const command = commands.get(interaction.commandName);

  if (!command) {
    await interaction.reply({ content: "Unbekannter Command.", ephemeral: true });
    return;
  }

  const response = await command.execute();
  await interaction.reply({ content: response, ephemeral: true });
});

void client.login(token);
