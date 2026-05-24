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
  options: { reportInstallation?: boolean } = {},
): Promise<GuildSyncSnapshot | null> {
  const client = createDashboardSyncClient(config);
  const reportInstallation = options.reportInstallation ?? true;

  if (reportInstallation && client.installationReportingEnabled) {
    logger.info(
      `Dashboard-Sync meldet Guild-Installation | guild=${guild.name} | id=${guild.id}`,
    );

    const installationReport = await client.reportGuildInstallation({
      guildId: guild.id,
      guildName: guild.name,
      installed: true,
    });

    if (!installationReport.ok) {
      logger.warn(
        `Dashboard-Sync konnte Bot-Installationsstatus fuer Guild ${guild.id} nicht melden: ${installationReport.message}`,
      );
    } else {
      logger.info(
        `Dashboard-Sync Guild-Installation gemeldet | guild=${guild.name}`,
      );
    }
  }

  if (!client.enabled) {
    logger.debug(
      `Dashboard-Sync fuer Guild ${guild.id} uebersprungen: Read-Sync nicht aktiviert oder unvollstaendig konfiguriert.`,
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
  const guildList = Array.from(guilds);
  const snapshots: GuildSyncSnapshot[] = [];
  const client = createDashboardSyncClient(config);

  if (client.installationReportingEnabled) {
    logger.info(
      `Dashboard-Sync Startup-Snapshot meldet ${guildList.length} Guilds als installiert.`,
    );

    const result = await client.reportGuildInstallationSnapshot({
      guilds: guildList.map((guild) => ({
        guildId: guild.id,
        guildName: guild.name,
      })),
    });

    if (!result.ok) {
      logger.warn(
        `Dashboard-Sync Startup-Snapshot fehlgeschlagen: ${result.message}`,
      );
    } else {
      logger.info(
        `Dashboard-Sync Startup-Snapshot gespeichert | installiert=${result.payload.snapshot.installedGuildCount} | entfernt=${result.payload.snapshot.removedGuildCount}`,
      );
    }
  } else {
    logger.warn(
      "Dashboard-Sync Startup-Snapshot uebersprungen: API-URL oder API-Secret fehlt.",
    );
  }

  for (const guild of guildList) {
    const snapshot = await prepareDashboardSyncForGuild(guild, config, {
      reportInstallation: false,
    });

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

export async function reportDashboardInstallationStatus(
  guild: Guild,
  config: BotConfig,
  installed: boolean,
) {
  const client = createDashboardSyncClient(config);

  if (!client.installationReportingEnabled) {
    logger.debug(
      `Dashboard-Sync Installationsstatus fuer Guild ${guild.id} uebersprungen: API-URL oder API-Secret fehlt.`,
    );
    return;
  }

  const result = await client.reportGuildInstallation({
    guildId: guild.id,
    guildName: guild.name,
    installed,
  });

  if (!result.ok) {
    logger.warn(
      `Dashboard-Sync konnte Bot-Installationsstatus fuer Guild ${guild.id} nicht melden: ${result.message}`,
    );
    return;
  }

  logger.info(
    `Dashboard-Sync ${installed ? "Guild-Installation" : "Guild-Entfernung"} gemeldet | guild=${guild.name} | installed=${installed}`,
  );
}
