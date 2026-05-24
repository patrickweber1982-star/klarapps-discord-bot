import type { BotConfig } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import { createDashboardSyncClient } from "./dashboardSyncClient.js";

const verifyModuleSlug = "verify-system";
const cacheTtlMs = 30_000;

type VerifyModuleCacheEntry = {
  enabled: boolean;
  checkedAt: number;
};

export type VerifyModuleStateResult = {
  enabled: boolean;
  source: "dashboard" | "cache" | "fallback";
  message: string;
};

const verifyModuleCache = new Map<string, VerifyModuleCacheEntry>();

function fallbackResult(message: string): VerifyModuleStateResult {
  return {
    enabled: true,
    source: "fallback",
    message,
  };
}

function readFreshCache(guildId: string): VerifyModuleStateResult | null {
  const cached = verifyModuleCache.get(guildId);

  if (!cached) {
    return null;
  }

  if (Date.now() - cached.checkedAt > cacheTtlMs) {
    return null;
  }

  return {
    enabled: cached.enabled,
    source: "cache",
    message: "Verify-System Status wurde aus dem lokalen Cache gelesen.",
  };
}

export async function readVerifyModuleState(
  config: BotConfig,
  guildId: string,
): Promise<VerifyModuleStateResult> {
  const client = createDashboardSyncClient(config);

  if (!client.enabled) {
    return fallbackResult(
      "Dashboard-Sync ist nicht aktiv. Verify-System nutzt lokales Fallback.",
    );
  }

  const result = await client.readGuildModules(guildId);

  if (!result.ok) {
    const cached = readFreshCache(guildId);

    if (cached) {
      return cached;
    }

    logger.warn(
      `Verify-System Modulstatus konnte nicht gelesen werden: ${result.message}`,
    );

    return fallbackResult(
      "Dashboard nicht erreichbar. Verify-System bleibt im sicheren Fallback aktiv.",
    );
  }

  const verifyModule = result.payload.modules.find(
    (module) => module.slug === verifyModuleSlug,
  );
  const enabled = Boolean(verifyModule?.enabled);

  verifyModuleCache.set(guildId, {
    enabled,
    checkedAt: Date.now(),
  });

  return {
    enabled,
    source: "dashboard",
    message: enabled
      ? "Verify-System ist im KlarApps Dashboard aktiviert."
      : "Verify-System ist im KlarApps Dashboard deaktiviert.",
  };
}
