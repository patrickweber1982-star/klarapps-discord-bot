import type { Guild } from "discord.js";

import type { BotConfig } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import { createDashboardSyncClient } from "./dashboardSyncClient.js";
import { createModuleSyncDecisions } from "./moduleSync.js";
import { evaluateTrialSyncState } from "./trialSync.js";
import type { DashboardSyncPayload } from "./types.js";

export type GuildSyncSnapshot = {
  guildId: string;
  guildName: string;
  connected: boolean;
  trialState: string;
  moduleCount: number;
  lockedModuleCount: number;
  shouldWarnOwner: boolean;
  shouldPrepareLeave: boolean;
  shouldLeaveNow: false;
};

export function buildGuildSyncSnapshot(
  guild: Guild,
  payload: DashboardSyncPayload,
): GuildSyncSnapshot {
  const moduleDecisions = createModuleSyncDecisions(
    payload.serverConfig.modules,
  );
  const trialDecision = evaluateTrialSyncState({
    trial: payload.serverConfig.trial,
    cooldown: payload.serverConfig.cooldown,
    expirationWarning: payload.serverConfig.expirationWarning,
    instructions: payload.botInstructions,
  });

  return {
    guildId: guild.id,
    guildName: guild.name,
    connected: payload.binding.status === "bound",
    trialState: trialDecision.state,
    moduleCount: moduleDecisions.length,
    lockedModuleCount: moduleDecisions.filter((module) => module.lockedByPlan)
      .length,
    shouldWarnOwner: trialDecision.shouldWarnOwner,
    shouldPrepareLeave: trialDecision.shouldPrepareLeave,
    shouldLeaveNow: false,
  };
}

export async function prepareDashboardSyncForGuild(
  guild: Guild,
  config: BotConfig,
): Promise<GuildSyncSnapshot | null> {
  const client = createDashboardSyncClient(config);

  if (!client.enabled) {
    logger.debug(
      `Dashboard-Sync fuer Guild ${guild.id} uebersprungen: nicht aktiviert oder unvollstaendig konfiguriert.`,
    );
    return null;
  }

  const result = await client.readGuildConfig(guild.id);

  if (!result.ok) {
    logger.warn(
      `Dashboard-Sync konnte Guild ${guild.id} nicht lesen: ${result.message}`,
    );
    return null;
  }

  const snapshot = buildGuildSyncSnapshot(guild, result.payload);

  logger.info(
    `Dashboard-Sync vorbereitet | guild=${snapshot.guildName} | trial=${snapshot.trialState} | modules=${snapshot.moduleCount} | leaveNow=${snapshot.shouldLeaveNow}`,
  );

  return snapshot;
}

export async function prepareDashboardSyncForGuilds(
  guilds: Iterable<Guild>,
  config: BotConfig,
) {
  const snapshots: GuildSyncSnapshot[] = [];

  for (const guild of guilds) {
    const snapshot = await prepareDashboardSyncForGuild(guild, config);

    if (snapshot) {
      snapshots.push(snapshot);
    }
  }

  if (snapshots.length > 0) {
    logger.success(
      `Dashboard-Sync Read-Only Foundation geladen: ${snapshots.length} Server.`,
    );
  }

  return snapshots;
}
