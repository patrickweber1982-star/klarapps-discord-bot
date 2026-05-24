import type { BotConfig } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import { createDashboardSyncClient } from "./dashboardSyncClient.js";

const verifyModuleSlug = "verify-system";
const ticketModuleSlug = "ticketsystem";
const cacheTtlMs = 30_000;

type LiveModuleSlug = typeof verifyModuleSlug | typeof ticketModuleSlug;

type ModuleCacheEntry = {
  enabled: boolean;
  checkedAt: number;
};

export type LiveModuleStateResult = {
  enabled: boolean;
  source: "dashboard" | "cache" | "fallback";
  message: string;
};

const moduleStateCache = new Map<string, ModuleCacheEntry>();

function cacheKey(guildId: string, moduleSlug: LiveModuleSlug) {
  return `${guildId}:${moduleSlug}`;
}

function moduleLabel(moduleSlug: LiveModuleSlug) {
  return moduleSlug === ticketModuleSlug ? "Ticketsystem" : "Verify-System";
}

function fallbackResult(
  moduleSlug: LiveModuleSlug,
  message: string,
): LiveModuleStateResult {
  return {
    enabled: true,
    source: "fallback",
    message: `${moduleLabel(moduleSlug)}: ${message}`,
  };
}

function readFreshCache(
  guildId: string,
  moduleSlug: LiveModuleSlug,
): LiveModuleStateResult | null {
  const cached = moduleStateCache.get(cacheKey(guildId, moduleSlug));

  if (!cached) {
    return null;
  }

  if (Date.now() - cached.checkedAt > cacheTtlMs) {
    return null;
  }

  return {
    enabled: cached.enabled,
    source: "cache",
    message: `${moduleLabel(moduleSlug)} Status wurde aus dem lokalen Cache gelesen.`,
  };
}

async function readLiveModuleState(
  config: BotConfig,
  guildId: string,
  moduleSlug: LiveModuleSlug,
): Promise<LiveModuleStateResult> {
  const client = createDashboardSyncClient(config);
  const label = moduleLabel(moduleSlug);

  if (!client.enabled) {
    return fallbackResult(
      moduleSlug,
      "Dashboard-Sync ist nicht aktiv. Das Modul nutzt lokales Fallback.",
    );
  }

  const result = await client.readGuildModules(guildId);

  if (!result.ok) {
    const cached = readFreshCache(guildId, moduleSlug);

    if (cached) {
      return cached;
    }

    logger.warn(`${label} Modulstatus konnte nicht gelesen werden: ${result.message}`);

    return fallbackResult(
      moduleSlug,
      "Dashboard nicht erreichbar. Das Modul bleibt im sicheren Fallback aktiv.",
    );
  }

  const module = result.payload.modules.find((item) => item.slug === moduleSlug);
  const enabled = Boolean(module?.enabled);

  moduleStateCache.set(cacheKey(guildId, moduleSlug), {
    enabled,
    checkedAt: Date.now(),
  });

  return {
    enabled,
    source: "dashboard",
    message: enabled
      ? `${label} ist im KlarApps Dashboard aktiviert.`
      : `${label} ist im KlarApps Dashboard deaktiviert.`,
  };
}

export async function readVerifyModuleState(
  config: BotConfig,
  guildId: string,
) {
  return readLiveModuleState(config, guildId, verifyModuleSlug);
}

export async function readTicketModuleState(
  config: BotConfig,
  guildId: string,
) {
  return readLiveModuleState(config, guildId, ticketModuleSlug);
}
