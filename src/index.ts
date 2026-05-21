import { Client, Events, GatewayIntentBits } from "discord.js";
import "dotenv/config";
import { klarbotCommand } from "./commands/klarbot.js";

const token = process.env.DISCORD_BOT_TOKEN;

if (!token) {
  throw new Error("DISCORD_BOT_TOKEN fehlt. Lege eine .env-Datei im Bot-Projekt an.");
}

const commands = new Map([[klarbotCommand.data.name, klarbotCommand]]);

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`KlarBot ist online als ${readyClient.user.tag}.`);
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
