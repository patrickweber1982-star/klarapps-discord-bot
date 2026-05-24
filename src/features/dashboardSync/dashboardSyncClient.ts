import type { BotConfig } from "../../config/env.js";
import type { DashboardSyncPayload, DashboardSyncReadResult } from "./types.js";

export type DashboardSyncClient = {
  enabled: boolean;
  readGuildConfig(guildId: string): Promise<DashboardSyncReadResult>;
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

function disabledResult(message: string): DashboardSyncReadResult {
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

  return {
    enabled,
    async readGuildConfig(guildId: string): Promise<DashboardSyncReadResult> {
      if (!dashboardSync.enabled) {
        return disabledResult("Dashboard-Sync ist deaktiviert.");
      }

      if (!dashboardSync.apiBaseUrl || !dashboardSync.syncToken) {
        return disabledResult(
          "Dashboard-Sync ist konfiguriert, aber API-URL oder Sync-Token fehlt.",
        );
      }

      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        dashboardSync.timeoutMs,
      );
      const endpoint = `${normalizeBaseUrl(
        dashboardSync.apiBaseUrl,
      )}/api/klarbot/sync/guild/${encodeURIComponent(guildId)}`;

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
                : "Dashboard-Sync konnte die Serverkonfiguration nicht laden.",
          };
        }

        if (!isDashboardSyncPayload(data)) {
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
    },
  };
}
