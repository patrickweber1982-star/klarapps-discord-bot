import type {
  DashboardBotInstructions,
  DashboardCooldownConfig,
  DashboardExpirationWarningConfig,
  DashboardTrialConfig,
} from "./types.js";

export type TrialRuntimeState =
  | "inactive"
  | "active"
  | "expiringSoon"
  | "expired"
  | "cooldownActive"
  | "removalPending";

export type TrialSyncDecision = {
  state: TrialRuntimeState;
  canRunModules: boolean;
  shouldWarnOwner: boolean;
  shouldPrepareLeave: boolean;
  shouldLeaveNow: false;
  warningMessage: string | null;
  upgradeHint: string;
};

export function evaluateTrialSyncState(input: {
  trial: DashboardTrialConfig;
  cooldown: DashboardCooldownConfig;
  expirationWarning: DashboardExpirationWarningConfig;
  instructions: DashboardBotInstructions;
}): TrialSyncDecision {
  const cooldownActive =
    input.cooldown.usedFreeTrialBefore &&
    !input.cooldown.eligibleForFreeTrial &&
    !input.cooldown.bypassWithActiveBasicOrPro;

  if (input.instructions.shouldQueueLeaveLater) {
    return {
      state: "removalPending",
      canRunModules: false,
      shouldWarnOwner: input.instructions.shouldSendExpirationWarningLater,
      shouldPrepareLeave: true,
      shouldLeaveNow: false,
      warningMessage: input.instructions.warningMessage,
      upgradeHint: input.instructions.upgradeHint,
    };
  }

  if (input.trial.phase === "expired") {
    return {
      state: cooldownActive ? "cooldownActive" : "expired",
      canRunModules: false,
      shouldWarnOwner: true,
      shouldPrepareLeave: true,
      shouldLeaveNow: false,
      warningMessage: input.instructions.warningMessage,
      upgradeHint: input.instructions.upgradeHint,
    };
  }

  if (input.trial.phase === "expiring_soon") {
    return {
      state: "expiringSoon",
      canRunModules: true,
      shouldWarnOwner: input.expirationWarning.shouldWarn,
      shouldPrepareLeave: false,
      shouldLeaveNow: false,
      warningMessage: input.instructions.warningMessage,
      upgradeHint: input.expirationWarning.upgradeHint,
    };
  }

  if (input.trial.phase === "active") {
    return {
      state: "active",
      canRunModules: true,
      shouldWarnOwner: false,
      shouldPrepareLeave: false,
      shouldLeaveNow: false,
      warningMessage: null,
      upgradeHint: input.expirationWarning.upgradeHint,
    };
  }

  return {
    state: "inactive",
    canRunModules: false,
    shouldWarnOwner: false,
    shouldPrepareLeave: false,
    shouldLeaveNow: false,
    warningMessage: null,
    upgradeHint: input.expirationWarning.upgradeHint,
  };
}
