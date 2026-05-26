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
  readVerifyConfig(
    guildId: string,
  ): Promise<DashboardInternalReadResult<DashboardVerifyConfigPayload>>;
  readJoinMessageConfig(
    guildId: string,
  ): Promise<DashboardInternalReadResult<DashboardJoinMessageConfigPayload>>;
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
  reportGuildSnapshot(input: DashboardGuildSnapshotInput): Promise<
    DashboardInternalReadResult<DashboardGuildSnapshotPayload>
  >;
  claimNextBotJob(): Promise<
    DashboardInternalReadResult<DashboardBotJobClaimPayload>
  >;
  completeBotJob(input: {
    jobId: string;
    status: "success" | "failed";
    messageId?: string | null;
    errorMessage?: string | null;
    result?: Record<string, unknown>;
  }): Promise<DashboardInternalReadResult<DashboardBotJobCompletedPayload>>;
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

type DashboardGuildSnapshotInput = {
  guildId: string;
  name: string;
  iconUrl: string | null;
  botInstalled: boolean;
  channels: Array<{
    id: string;
    name: string;
    type: string;
    parentId: string | null;
    position: number | null;
    botCanView: boolean;
    botCanSend: boolean;
  }>;
  roles: Array<{
    id: string;
    name: string;
    color: string | null;
    position: number | null;
    managed: boolean;
    botCanAssign: boolean;
  }>;
};

type DashboardGuildSnapshotPayload = {
  ok: true;
  mode: "klarbot_guild_snapshot";
  guildId: string;
  synced: {
    channels: number;
    roles: number;
    lastSyncedAt: string | Date;
  };
};

export type DashboardVerifyConfigPayload = {
  ok: true;
  mode: "klarbot_verify_config";
  guildId: string;
  verifyConfig: {
    guildId: string;
    enabled: boolean;
    status: string;
    verifyChannelId: string;
    channelDescription?: string;
    channelHint?: string;
    publishedMessageId?: string;
    publishedAt?: string;
    embedColor?: string;
    bannerImageUrl?: string;
    embedTitle: string;
    embedDescription: string;
    embedFooter: string;
    confirmationMode: "button" | "emoji";
    confirmationEmoji: string;
    confirmationHint?: string;
    buttonLabel: string;
    verifiedRoleId: string;
    removeRoleId: string;
    roleHint?: string;
    updatedAt: string;
  };
};

export type DashboardVerifyConfig =
  DashboardVerifyConfigPayload["verifyConfig"];

export type DashboardJoinMessageConfigPayload = {
  ok: true;
  mode: "klarbot_join_message_config";
  guildId: string;
  joinMessageConfig: {
    guildId: string;
    enabled: boolean;
    status: string;
    joinChannelId: string;
    messageText: string;
    pingUser: boolean;
    useEmbed: boolean;
    imageUrl: string;
    embedTitle: string;
    embedColor: string;
    embedFooter: string;
    publishedAt?: string;
    updatedAt: string;
  };
};

export type DashboardJoinMessageConfig =
  DashboardJoinMessageConfigPayload["joinMessageConfig"];

export type DashboardInfoBlockConfig = {
  id: string;
  type: "image" | "embed";
  sortOrder: number;
  imageUrl: string;
  title: string;
  description: string;
  color: string;
  footer: string;
};

export type DashboardInfoConfig = {
  guildId?: string;
  channelId: string;
  enabled?: boolean;
  publishedAt?: string;
  blocks: DashboardInfoBlockConfig[];
};

export type DashboardServerProfileConfig = {
  guildId?: string;
  nickname: string;
  enabled?: boolean;
  lastAppliedAt?: string;
};

type DashboardBotJob = {
  id: string;
  jobType:
    | "VERIFY_PUBLISH"
    | "JOIN_MESSAGE_PUBLISH"
    | "INFO_PUBLISH"
    | "SERVER_PROFILE_APPLY";
  status: "processing";
  guildId: string;
  moduleSlug: string | null;
  configId: string | null;
  channelId: string | null;
  messageId: string | null;
  payload: {
    verifyConfig?: DashboardVerifyConfig;
    joinMessageConfig?: DashboardJoinMessageConfig;
    infoConfig?: DashboardInfoConfig;
    serverProfileConfig?: DashboardServerProfileConfig;
    guildName?: string;
  };
  attempts: number;
};

type DashboardBotJobClaimPayload = {
  ok: true;
  mode: "klarbot_job_claim";
  job: DashboardBotJob | null;
};

type DashboardBotJobCompletedPayload = {
  ok: true;
  mode: "klarbot_job_completed";
  job: {
    id: string;
    jobType:
      | "VERIFY_PUBLISH"
      | "JOIN_MESSAGE_PUBLISH"
      | "INFO_PUBLISH"
      | "SERVER_PROFILE_APPLY";
    status: "success" | "failed";
    guildId: string;
    messageId: string | null;
    errorMessage: string | null;
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

function isDashboardVerifyConfigPayload(
  value: unknown,
): value is DashboardVerifyConfigPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Partial<DashboardVerifyConfigPayload>;
  const config = payload.verifyConfig;

  return (
    payload.ok === true &&
    payload.mode === "klarbot_verify_config" &&
    typeof payload.guildId === "string" &&
    Boolean(config) &&
    typeof config?.enabled === "boolean" &&
    typeof config?.status === "string" &&
    typeof config?.verifyChannelId === "string" &&
    typeof config?.embedTitle === "string" &&
    typeof config?.embedDescription === "string" &&
    typeof config?.embedFooter === "string" &&
    (config?.confirmationMode === "button" ||
      config?.confirmationMode === "emoji") &&
    typeof config?.buttonLabel === "string"
  );
}

function isDashboardJoinMessageConfigPayload(
  value: unknown,
): value is DashboardJoinMessageConfigPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Partial<DashboardJoinMessageConfigPayload>;
  const config = payload.joinMessageConfig;

  return (
    payload.ok === true &&
    payload.mode === "klarbot_join_message_config" &&
    typeof payload.guildId === "string" &&
    Boolean(config) &&
    typeof config?.enabled === "boolean" &&
    typeof config?.status === "string" &&
    typeof config?.joinChannelId === "string" &&
    typeof config?.messageText === "string" &&
    typeof config?.pingUser === "boolean" &&
    typeof config?.useEmbed === "boolean" &&
    typeof config?.imageUrl === "string" &&
    typeof config?.embedTitle === "string" &&
    typeof config?.embedColor === "string" &&
    typeof config?.embedFooter === "string"
  );
}

function isDashboardGuildSnapshotPayload(
  value: unknown,
): value is DashboardGuildSnapshotPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Partial<DashboardGuildSnapshotPayload>;

  return (
    payload.ok === true &&
    payload.mode === "klarbot_guild_snapshot" &&
    typeof payload.guildId === "string" &&
    typeof payload.synced?.channels === "number" &&
    typeof payload.synced?.roles === "number"
  );
}

function isDashboardBotJobClaimPayload(
  value: unknown,
): value is DashboardBotJobClaimPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Partial<DashboardBotJobClaimPayload>;
  const job = payload.job as Partial<DashboardBotJob> | null | undefined;

  if (
    payload.ok !== true ||
    payload.mode !== "klarbot_job_claim" ||
    job === undefined
  ) {
    return false;
  }

  if (job === null) {
    return true;
  }

  const verifyConfig = job.payload?.verifyConfig;
  const joinMessageConfig = job.payload?.joinMessageConfig;
  const infoConfig = job.payload?.infoConfig;
  const serverProfileConfig = job.payload?.serverProfileConfig;

  if (
    job.status !== "processing" ||
    typeof job.id !== "string" ||
    typeof job.guildId !== "string"
  ) {
    return false;
  }

  if (job.jobType === "VERIFY_PUBLISH") {
    return (
      Boolean(verifyConfig) &&
      typeof verifyConfig?.verifyChannelId === "string" &&
      typeof verifyConfig?.embedTitle === "string" &&
      typeof verifyConfig?.embedDescription === "string" &&
      (verifyConfig?.confirmationMode === "button" ||
        verifyConfig?.confirmationMode === "emoji") &&
      typeof verifyConfig?.verifiedRoleId === "string"
    );
  }

  if (job.jobType === "JOIN_MESSAGE_PUBLISH") {
    return (
      Boolean(joinMessageConfig) &&
      typeof joinMessageConfig?.joinChannelId === "string" &&
      typeof joinMessageConfig?.messageText === "string" &&
      typeof joinMessageConfig?.pingUser === "boolean" &&
      typeof joinMessageConfig?.useEmbed === "boolean"
    );
  }

  if (job.jobType === "INFO_PUBLISH") {
    return (
      Boolean(infoConfig) &&
      typeof infoConfig?.channelId === "string" &&
      Array.isArray(infoConfig?.blocks)
    );
  }

  if (job.jobType === "SERVER_PROFILE_APPLY") {
    return (
      Boolean(serverProfileConfig) &&
      typeof serverProfileConfig?.nickname === "string"
    );
  }

  return false;
}

function isDashboardBotJobCompletedPayload(
  value: unknown,
): value is DashboardBotJobCompletedPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Partial<DashboardBotJobCompletedPayload>;

  return (
    payload.ok === true &&
    payload.mode === "klarbot_job_completed" &&
    (payload.job?.jobType === "VERIFY_PUBLISH" ||
      payload.job?.jobType === "JOIN_MESSAGE_PUBLISH" ||
      payload.job?.jobType === "INFO_PUBLISH" ||
      payload.job?.jobType === "SERVER_PROFILE_APPLY") &&
    (payload.job.status === "success" || payload.job.status === "failed")
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
    options: { requireEnabled?: boolean } = {},
  ): Promise<DashboardInternalReadResult<TPayload>> {
    if (options.requireEnabled !== false && !dashboardSync.enabled) {
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
    async readVerifyConfig(guildId: string) {
      return readInternal(
        `/api/bot/guilds/${encodeURIComponent(guildId)}/verify-config`,
        isDashboardVerifyConfigPayload,
        "Verify-Konfiguration konnte nicht geladen werden.",
        { requireEnabled: false },
      );
    },
    async readJoinMessageConfig(guildId: string) {
      return readInternal(
        `/api/bot/guilds/${encodeURIComponent(guildId)}/join-message-config`,
        isDashboardJoinMessageConfigPayload,
        "Join-Message-Konfiguration konnte nicht geladen werden.",
        { requireEnabled: false },
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
    async reportGuildSnapshot(input) {
      return postInternal(
        "/api/bot/sync/guild-snapshot",
        {
          guildId: input.guildId,
          name: input.name,
          iconUrl: input.iconUrl,
          botInstalled: input.botInstalled,
          channels: input.channels,
          roles: input.roles,
        },
        isDashboardGuildSnapshotPayload,
        "Dashboard-Sync konnte den Guild-Snapshot nicht speichern.",
      );
    },
    async claimNextBotJob() {
      return postInternal(
        "/api/bot/jobs/claim",
        {},
        isDashboardBotJobClaimPayload,
        "Dashboard-Sync konnte keinen Bot-Job abrufen.",
      );
    },
    async completeBotJob(input) {
      return postInternal(
        `/api/bot/jobs/${encodeURIComponent(input.jobId)}/complete`,
        {
          status: input.status,
          messageId: input.messageId ?? null,
          errorMessage: input.errorMessage ?? null,
          result: input.result ?? {},
        },
        isDashboardBotJobCompletedPayload,
        "Dashboard-Sync konnte den Bot-Job Status nicht speichern.",
      );
    },
  };
}
