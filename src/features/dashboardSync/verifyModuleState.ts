import type { BotConfig } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import { createDashboardSyncClient } from "./dashboardSyncClient.js";

const verifyModuleSlug = "verify-system";
const ticketModuleSlug = "ticketsystem";
const rolesChannelsModuleSlug = "rollen-channels";
const cacheTtlMs = 30_000;

type LiveModuleSlug =
  | typeof verifyModuleSlug
  | typeof ticketModuleSlug
  | typeof rolesChannelsModuleSlug;

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
  if (moduleSlug === ticketModuleSlug) {
    return "Ticketsystem";
  }

  if (moduleSlug === rolesChannelsModuleSlug) {
    return "Rollen & Channels";
  }

  return "Verify-System";
}

function fallbackResult(
  moduleSlug: LiveModuleSlug,
  message: string,
): LiveModuleStateResult {
  return {
    enabled: false,
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
      "Dashboard-Sync ist nicht aktiv. Das Modul bleibt sicher deaktiviert.",
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
      "Dashboard nicht erreichbar. Das Modul bleibt sicher deaktiviert.",
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

export async function readRolesChannelsModuleState(
  config: BotConfig,
  guildId: string,
) {
  return readLiveModuleState(config, guildId, rolesChannelsModuleSlug);
}
