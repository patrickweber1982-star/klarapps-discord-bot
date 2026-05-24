export type DashboardSyncMode = "read_only_foundation";
export type DashboardSyncState =
  | "prepared"
  | "dashboard_readable"
  | "bot_readable_later"
  | "live_disabled";

export type DashboardTrialPhase =
  | "not_started"
  | "active"
  | "expiring_soon"
  | "expired";

export type DashboardBotLeaveIntentStatus =
  | "not_required"
  | "warning_state"
  | "removal_pending"
  | "reactivation_available";

export type DashboardModuleConfig = {
  slug: string;
  title: string;
  requiredPlan: string;
  enabled: boolean;
  locked: boolean;
  syncState: DashboardSyncState;
};

export type DashboardTrialConfig = {
  phase: DashboardTrialPhase;
  state: string;
  label: string;
  daysRemaining: number | null;
  trialStartsAt: string | Date | null;
  trialEndsAt: string | Date | null;
  enforcementMode: "prepared_only";
};

export type DashboardCooldownConfig = {
  usedFreeTrialBefore: boolean;
  cooldownDays: number;
  cooldownEndsAt: string | Date | null;
  bypassWithActiveBasicOrPro: boolean;
  eligibleForFreeTrial: boolean;
  note: string;
};

export type DashboardExpirationWarningConfig = {
  warningDaysBeforeExpiration: number;
  shouldWarn: boolean;
  deliveryPrepared: boolean;
  deliveryChannels: string[];
  upgradeHint: string;
};

export type DashboardServerConfig = {
  discordGuildId: string | null;
  discordGuildName: string | null;
  syncState: DashboardSyncState;
  liveSyncEnabled: false;
  dashboardCanRead: boolean;
  botCanReadLater: boolean;
  dashboardCanWriteLive: false;
  botCanWriteWebsiteState: false;
  safeUpdateMode: "prepared_only";
  accessLabel: string;
  modules: DashboardModuleConfig[];
  trial: DashboardTrialConfig;
  cooldown: DashboardCooldownConfig;
  expirationWarning: DashboardExpirationWarningConfig;
  references: {
    product: "KlarBot";
    licenseReference: string;
    trialReference: string;
  };
};

export type DashboardBotInstructions = {
  shouldApplyModuleChanges: false;
  shouldEditRolesOrChannels: false;
  shouldLeaveServer: false;
  shouldSendExpirationWarningLater: boolean;
  shouldQueueLeaveLater: boolean;
  warningMessage: string;
  upgradeHint: string;
};

export type DashboardSyncPayload = {
  ok: true;
  contractVersion: string;
  mode: DashboardSyncMode;
  guildId: string;
  binding: {
    status: "bound" | "unbound";
    label: string | null;
    environment: string | null;
    isTest: boolean | null;
  };
  sync: {
    liveSyncEnabled: false;
    botCanReadCentralConfig: true;
    botCanWriteWebsiteState: false;
    dashboardControlsLiveBot: false;
    websocketSyncEnabled: false;
    discordApiMutationEnabled: false;
  };
  serverConfig: DashboardServerConfig;
  liveTestModules?: {
    verifySystem: {
      moduleSlug: "verify-system";
      enabled: boolean;
      status: "enabled" | "disabled";
      source: "dashboard_database";
    };
    ticketSystem: {
      moduleSlug: "ticketsystem";
      enabled: boolean;
      status: "enabled" | "disabled";
      source: "dashboard_database";
    };
  };
  botInstructions: DashboardBotInstructions;
  security: {
    tokenAuthenticated: true;
    secretsIncluded: false;
    botTokenIncluded: false;
  };
};

export type DashboardSyncHealthPayload = {
  ok: true;
  contractVersion: string;
  mode: DashboardSyncMode;
  service: "klarbot-internal-api";
  endpoints: {
    health: string;
    config: string;
    trial: string;
    modules: string;
  };
  capabilities: {
    readConfig: true;
    readModuleStates: true;
    readTrialState: true;
    readServerBinding: true;
    writeSyncEnabled: false;
    liveDiscordMutationsEnabled: false;
    websocketSyncEnabled: false;
  };
  security: {
    tokenAuthenticated: true;
    secretsIncluded: false;
    botTokenIncluded: false;
  };
};

export type DashboardTrialSyncPayload = Pick<
  DashboardSyncPayload,
  "ok" | "contractVersion" | "mode" | "guildId" | "binding" | "security"
> & {
  trial: DashboardServerConfig["trial"];
  cooldown: DashboardServerConfig["cooldown"];
  expirationWarning: DashboardServerConfig["expirationWarning"];
  botInstructions: Pick<
    DashboardBotInstructions,
    | "shouldLeaveServer"
    | "shouldSendExpirationWarningLater"
    | "shouldQueueLeaveLater"
    | "warningMessage"
    | "upgradeHint"
  >;
};

export type DashboardModuleStateSyncPayload = Pick<
  DashboardSyncPayload,
  "ok" | "contractVersion" | "mode" | "guildId" | "binding" | "security"
> & {
  modules: DashboardServerConfig["modules"];
  sync: Pick<
    DashboardSyncPayload["sync"],
    | "liveSyncEnabled"
    | "botCanReadCentralConfig"
    | "botCanWriteWebsiteState"
    | "dashboardControlsLiveBot"
    | "discordApiMutationEnabled"
  >;
  botInstructions: Pick<
    DashboardBotInstructions,
    "shouldApplyModuleChanges" | "shouldEditRolesOrChannels"
  >;
};

export type DashboardSyncReadResult =
  | {
      ok: true;
      payload: DashboardSyncPayload;
    }
  | {
      ok: false;
      status: number | null;
      message: string;
    };
