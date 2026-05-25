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
    host: string;
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

function stripWrappingQuotes(value: string) {
  const trimmed = value.trim();
  const first = trimmed.at(0);
  const last = trimmed.at(-1);

  if (
    trimmed.length >= 2 &&
    ((first === '"' && last === '"') || (first === "'" && last === "'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function readOptionalSecretEnv(key: string) {
  const value = readOptionalEnv(key);

  if (!value) {
    return null;
  }

  const withoutBearer = value.replace(/^Bearer\s+/i, "").trim();
  const normalized = stripWrappingQuotes(withoutBearer);

  return normalized.length > 0 ? normalized : null;
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

function readOptionalBooleanEnv(key: string) {
  const value = readOptionalEnv(key)?.toLowerCase();

  if (!value) {
    return null;
  }

  if (["1", "true", "yes", "on"].includes(value)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(value)) {
    return false;
  }

  return null;
}

export function readDashboardSyncEnvironment(): DashboardSyncEnvironment {
  return {
    enabled: process.env.KLARBOT_DASHBOARD_SYNC_ENABLED === "true",
    apiBaseUrl: readOptionalEnv("KLARAPPS_API_BASE_URL"),
    syncToken: readOptionalSecretEnv("KLARAPPS_BOT_API_SECRET"),
    timeoutMs: Number(process.env.KLARBOT_SYNC_TIMEOUT_MS ?? 5000),
  };
}

export function readInternalApiEnvironment(): InternalApiEnvironment {
  const secret =
    readOptionalSecretEnv("KLARAPPS_BOT_API_SECRET") ??
    readOptionalSecretEnv("KLARBOT_INTERNAL_API_SECRET");
  const enabledFlag = readOptionalBooleanEnv("KLARBOT_INTERNAL_API_ENABLED");

  return {
    enabled: enabledFlag ?? Boolean(secret),
    host: readOptionalEnv("KLARBOT_INTERNAL_API_HOST") ?? "127.0.0.1",
    port: Number(process.env.KLARBOT_INTERNAL_API_PORT ?? 4107),
    secret,
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
