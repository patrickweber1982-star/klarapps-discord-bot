import {
  readDashboardSyncEnvironment,
  type BotConfig,
} from "../../config/env.js";
import type {
  DashboardModuleStateSyncPayload,
  DashboardSyncHealthPayload,
  DashboardSyncPayload,
  DashboardSyncReadResult,
  DashboardTrialSyncPayload,
} from "./types.js";

export type DashboardSyncClient = {
  enabled: boolean;
  installationReportingEnabled: boolean;
  readHealth(): Promise<DashboardInternalReadResult<DashboardSyncHealthPayload>>;
  readGuildConfig(guildId: string): Promise<DashboardSyncReadResult>;
  readGuildTrial(
    guildId: string,
  ): Promise<DashboardInternalReadResult<DashboardTrialSyncPayload>>;
  readGuildModules(
    guildId: string,
  ): Promise<DashboardInternalReadResult<DashboardModuleStateSyncPayload>>;
  reportGuildInstallation(input: {
    guildId: string;
    guildName: string;
    installed: boolean;
  }): Promise<DashboardInternalReadResult<DashboardInstallationStatusPayload>>;
  reportGuildInstallationSnapshot(input: {
    guilds: Array<{
      guildId: string;
      guildName: string;
    }>;
  }): Promise<DashboardInternalReadResult<DashboardInstallationSnapshotPayload>>;
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

type DashboardInstallationStatusPayload = {
  ok: true;
  mode: "klarbot_installation_status";
  guildId: string;
  installation: {
    guildId: string;
    guildName: string | null;
    status: "installed" | "not_installed";
    lastSeenAt: string | Date | null;
  };
};

type DashboardInstallationSnapshotPayload = {
  ok: true;
  mode: "klarbot_installation_snapshot";
  snapshot: {
    installedGuildCount: number;
    removedGuildCount: number;
    lastSyncedAt: string | Date | null;
  };
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

function isDashboardInstallationStatusPayload(
  value: unknown,
): value is DashboardInstallationStatusPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Partial<DashboardInstallationStatusPayload>;

  return (
    payload.ok === true &&
    payload.mode === "klarbot_installation_status" &&
    typeof payload.guildId === "string" &&
    Boolean(payload.installation) &&
    (payload.installation?.status === "installed" ||
      payload.installation?.status === "not_installed")
  );
}

function isDashboardInstallationSnapshotPayload(
  value: unknown,
): value is DashboardInstallationSnapshotPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Partial<DashboardInstallationSnapshotPayload>;

  return (
    payload.ok === true &&
    payload.mode === "klarbot_installation_snapshot" &&
    Boolean(payload.snapshot) &&
    typeof payload.snapshot?.installedGuildCount === "number" &&
    typeof payload.snapshot?.removedGuildCount === "number"
  );
}

function disabledResult(message: string): DashboardInternalReadFailure {
  return {
    ok: false,
    status: null,
    message,
  };
}

export function createDashboardSyncClient(_config: BotConfig): DashboardSyncClient {
  const dashboardSync = readDashboardSyncEnvironment();
  const hasApiConnection = Boolean(
    dashboardSync.apiBaseUrl && dashboardSync.syncToken,
  );
  const enabled = Boolean(dashboardSync.enabled && hasApiConnection);

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

  async function postInternal<TPayload>(
    path: string,
    body: Record<string, unknown>,
    guard: (value: unknown) => value is TPayload,
    fallbackMessage: string,
  ): Promise<DashboardInternalReadResult<TPayload>> {
    if (!dashboardSync.apiBaseUrl || !dashboardSync.syncToken) {
      return disabledResult(
        "Dashboard-API URL oder API-Secret fehlt.",
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
        method: "POST",
        headers: {
          Authorization: `Bearer ${dashboardSync.syncToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
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
            "Dashboard-Sync Antwort passt nicht zum erwarteten Installationsstatus-Vertrag.",
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
    installationReportingEnabled: hasApiConnection,
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
    async reportGuildInstallation(input) {
      return postInternal(
        `/api/klarbot/internal/guild/${encodeURIComponent(input.guildId)}/installation`,
        {
          guildName: input.guildName,
          installed: input.installed,
        },
        isDashboardInstallationStatusPayload,
        "Dashboard-Sync konnte den Bot-Installationsstatus nicht melden.",
      );
    },
    async reportGuildInstallationSnapshot(input) {
      return postInternal(
        "/api/klarbot/internal/installations/snapshot",
        {
          guilds: input.guilds.map((guild) => ({
            id: guild.guildId,
            name: guild.guildName,
          })),
        },
        isDashboardInstallationSnapshotPayload,
        "Dashboard-Sync konnte den Bot-Installationssnapshot nicht melden.",
      );
    },
  };
}
