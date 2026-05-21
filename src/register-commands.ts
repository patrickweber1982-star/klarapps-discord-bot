import { REST, Routes } from "discord.js";
import "dotenv/config";
import { klarbotCommand } from "./commands/klarbot.js";

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId || !guildId) {
  throw new Error(
    "DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID und DISCORD_GUILD_ID muessen gesetzt sein.",
  );
}

const rest = new REST({ version: "10" }).setToken(token);
const commands = [klarbotCommand.data.toJSON()];

await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });

console.log("Discord-Command /klarbot wurde fuer den Server registriert.");
