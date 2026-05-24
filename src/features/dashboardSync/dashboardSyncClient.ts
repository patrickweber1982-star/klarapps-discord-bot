import type { BotConfig } from "../../config/env.js";
import type {
  DashboardModuleStateSyncPayload,
  DashboardSyncHealthPayload,
  DashboardSyncPayload,
  DashboardSyncReadResult,
  DashboardTrialSyncPayload,
} from "./types.js";

export type DashboardSyncClient = {
  enabled: boolean;
  readHealth(): Promise<DashboardInternalReadResult<DashboardSyncHealthPayload>>;
  readGuildConfig(guildId: string): Promise<DashboardSyncReadResult>;
  readGuildTrial(
    guildId: string,
  ): Promise<DashboardInternalReadResult<DashboardTrialSyncPayload>>;
  readGuildModules(
    guildId: string,
  ): Promise<DashboardInternalReadResult<DashboardModuleStateSyncPayload>>;
};

type DashboardInternalReadResult<TPayload> =
  | {
      ok: true;
      payload: TPayload;
    }
  | DashboardInternalReadFailure;

type DashboardInternalReadFailure = {
  ok: false;
  status: number | null;
  message: string;
};

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function isDashboardSyncPayload(value: unknown): value is DashboardSyncPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Partial<DashboardSyncPayload>;

  return (
    payload.ok === true &&
    payload.mode === "read_only_foundation" &&
    typeof payload.guildId === "string" &&
    Boolean(payload.serverConfig) &&
    Boolean(payload.botInstructions) &&
    payload.sync?.botCanWriteWebsiteState === false &&
    payload.sync?.dashboardControlsLiveBot === false
  );
}

function isDashboardSyncHealthPayload(
  value: unknown,
): value is DashboardSyncHealthPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Partial<DashboardSyncHealthPayload>;

  return (
    payload.ok === true &&
    payload.mode === "read_only_foundation" &&
    payload.service === "klarbot-internal-api" &&
    payload.capabilities?.writeSyncEnabled === false &&
    payload.capabilities?.liveDiscordMutationsEnabled === false
  );
}

function isDashboardTrialSyncPayload(
  value: unknown,
): value is DashboardTrialSyncPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Partial<DashboardTrialSyncPayload>;

  return (
    payload.ok === true &&
    payload.mode === "read_only_foundation" &&
    typeof payload.guildId === "string" &&
    Boolean(payload.trial) &&
    Boolean(payload.cooldown) &&
    payload.botInstructions?.shouldLeaveServer === false
  );
}

function isDashboardModuleStateSyncPayload(
  value: unknown,
): value is DashboardModuleStateSyncPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Partial<DashboardModuleStateSyncPayload>;

  return (
    payload.ok === true &&
    payload.mode === "read_only_foundation" &&
    typeof payload.guildId === "string" &&
    Array.isArray(payload.modules) &&
    payload.sync?.botCanWriteWebsiteState === false &&
    payload.botInstructions?.shouldApplyModuleChanges === false
  );
}

function disabledResult(message: string): DashboardInternalReadFailure {
  return {
    ok: false,
    status: null,
    message,
  };
}

export function createDashboardSyncClient(config: BotConfig): DashboardSyncClient {
  const { dashboardSync } = config;
  const enabled = Boolean(
    dashboardSync.enabled &&
      dashboardSync.apiBaseUrl &&
      dashboardSync.syncToken,
  );

  async function readInternal<TPayload>(
    path: string,
    guard: (value: unknown) => value is TPayload,
    fallbackMessage: string,
  ): Promise<DashboardInternalReadResult<TPayload>> {
    if (!dashboardSync.enabled) {
      return disabledResult("Dashboard-Sync ist deaktiviert.");
    }

    if (!dashboardSync.apiBaseUrl || !dashboardSync.syncToken) {
      return disabledResult(
        "Dashboard-Sync ist konfiguriert, aber API-URL oder API-Secret fehlt.",
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      dashboardSync.timeoutMs,
    );
    const endpoint = `${normalizeBaseUrl(dashboardSync.apiBaseUrl)}${path}`;

    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${dashboardSync.syncToken}`,
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      const data = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          message:
            data && typeof data === "object" && "message" in data
              ? String((data as { message?: unknown }).message)
              : fallbackMessage,
        };
      }

      if (!guard(data)) {
        return {
          ok: false,
          status: response.status,
          message:
            "Dashboard-Sync Antwort passt nicht zum erwarteten Read-Only-Vertrag.",
        };
      }

      return {
        ok: true,
        payload: data,
      };
    } catch (error) {
      return {
        ok: false,
        status: null,
        message:
          error instanceof Error
            ? error.message
            : "Unbekannter Dashboard-Sync Fehler.",
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    enabled,
    async readHealth() {
      return readInternal(
        "/api/klarbot/internal/health",
        isDashboardSyncHealthPayload,
        "Dashboard-Sync Health konnte nicht gelesen werden.",
      );
    },
    async readGuildConfig(guildId: string): Promise<DashboardSyncReadResult> {
      return readInternal(
        `/api/klarbot/internal/guild/${encodeURIComponent(guildId)}/config`,
        isDashboardSyncPayload,
        "Dashboard-Sync konnte die Serverkonfiguration nicht laden.",
      );
    },
    async readGuildTrial(guildId: string) {
      return readInternal(
        `/api/klarbot/internal/guild/${encodeURIComponent(guildId)}/trial`,
        isDashboardTrialSyncPayload,
        "Dashboard-Sync konnte den Trialstatus nicht laden.",
      );
    },
    async readGuildModules(guildId: string) {
      return readInternal(
        `/api/klarbot/internal/guild/${encodeURIComponent(guildId)}/modules`,
        isDashboardModuleStateSyncPayload,
        "Dashboard-Sync konnte den Modulstatus nicht laden.",
      );
    },
  };
}
