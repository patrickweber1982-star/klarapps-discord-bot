import "dotenv/config";

export type BotConfig = {
  discordBotToken: string;
  discordClientId: string;
  discordGuildId: string;
  nodeEnv: string;
  debug: boolean;
};

const requiredEnvKeys = [
  "DISCORD_BOT_TOKEN",
  "DISCORD_CLIENT_ID",
  "DISCORD_GUILD_ID",
] as const;

function readRequiredEnv(key: (typeof requiredEnvKeys)[number]) {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(
      `Environment Variable ${key} fehlt. Lege sie in .env an oder setze sie im Server-Environment.`,
    );
  }

  return value;
}

export function loadConfig(): BotConfig {
  return {
    discordBotToken: readRequiredEnv("DISCORD_BOT_TOKEN"),
    discordClientId: readRequiredEnv("DISCORD_CLIENT_ID"),
    discordGuildId: readRequiredEnv("DISCORD_GUILD_ID"),
    nodeEnv: process.env.NODE_ENV?.trim() || "development",
    debug: process.env.DEBUG === "true",
  };
}
