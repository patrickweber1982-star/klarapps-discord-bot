import "dotenv/config";

export type BotConfig = {
  discordBotToken: string;
  discordClientId: string;
  discordGuildId: string | null;
  nodeEnv: string;
  debug: boolean;
  dashboardSync: {
    enabled: boolean;
    apiBaseUrl: string | null;
    syncToken: string | null;
    timeoutMs: number;
  };
  internalApi: {
    enabled: boolean;
    port: number;
    secret: string | null;
  };
};

export type DashboardSyncEnvironment = BotConfig["dashboardSync"];
export type InternalApiEnvironment = BotConfig["internalApi"];

const requiredEnvKeys = [
  "DISCORD_BOT_TOKEN",
  "DISCORD_CLIENT_ID",
] as const;

function readOptionalEnv(key: string) {
  const value = process.env[key];
  const trimmed = value?.trim();

  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function readRequiredEnv(key: (typeof requiredEnvKeys)[number]) {
  const value = readOptionalEnv(key);

  if (!value) {
    throw new Error(
      `Environment Variable ${key} fehlt. Lege sie in .env an oder setze sie im Server-Environment.`,
    );
  }

  return value;
}

export function readDashboardSyncEnvironment(): DashboardSyncEnvironment {
  return {
    enabled: process.env.KLARBOT_DASHBOARD_SYNC_ENABLED === "true",
    apiBaseUrl: readOptionalEnv("KLARAPPS_API_BASE_URL"),
    syncToken: readOptionalEnv("KLARAPPS_BOT_API_SECRET"),
    timeoutMs: Number(process.env.KLARBOT_SYNC_TIMEOUT_MS ?? 5000),
  };
}

export function readInternalApiEnvironment(): InternalApiEnvironment {
  return {
    enabled: process.env.KLARBOT_INTERNAL_API_ENABLED === "true",
    port: Number(process.env.KLARBOT_INTERNAL_API_PORT ?? 4107),
    secret:
      readOptionalEnv("KLARBOT_INTERNAL_API_SECRET") ??
      readOptionalEnv("KLARAPPS_BOT_API_SECRET"),
  };
}

export function loadConfig(): BotConfig {
  return {
    discordBotToken: readRequiredEnv("DISCORD_BOT_TOKEN"),
    discordClientId: readRequiredEnv("DISCORD_CLIENT_ID"),
    discordGuildId: readOptionalEnv("DISCORD_GUILD_ID"),
    nodeEnv: process.env.NODE_ENV?.trim() || "development",
    debug: process.env.DEBUG === "true",
    dashboardSync: readDashboardSyncEnvironment(),
    internalApi: readInternalApiEnvironment(),
  };
}
