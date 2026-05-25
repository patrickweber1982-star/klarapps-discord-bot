import type { Client } from "discord.js";

import type { BotConfig } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import { publishVerifyPanelForGuild } from "../verify/verifyPanelSync.js";
import { createDashboardSyncClient } from "./dashboardSyncClient.js";

let workerStarted = false;
let workerRunning = false;

function pollIntervalMs() {
  const value = Number(process.env.KLARBOT_JOB_POLL_INTERVAL_MS ?? 10_000);

  return Number.isFinite(value) && value >= 2_000 ? value : 10_000;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function processNextJob(client: Client, config: BotConfig) {
  if (workerRunning) {
    return;
  }

  workerRunning = true;

  try {
    const syncClient = createDashboardSyncClient(config);
    const claim = await syncClient.claimNextVerifyPublishJob();

    if (!claim.ok) {
      logger.warn(`Bot-Job konnte nicht abgerufen werden: ${claim.message}`);
      return;
    }

    if (!claim.payload.job) {
      return;
    }

    const job = claim.payload.job;

    logger.info(
      `Bot-Job wird verarbeitet | id=${job.id} | type=${job.jobType} | guild=${job.guildId}`,
    );

    const guild = await client.guilds.fetch(job.guildId).catch(() => null);

    if (!guild) {
      await syncClient.completeBotJob({
        jobId: job.id,
        status: "failed",
        errorMessage: "KlarBot ist auf diesem Server nicht installiert oder kann die Guild nicht laden.",
      });
      return;
    }

    const publishResult = await publishVerifyPanelForGuild(
      client,
      job.guildId,
      job.payload.verifyConfig,
      job.messageId || job.payload.verifyConfig.publishedMessageId || null,
    );

    if (!publishResult.ok) {
      await syncClient.completeBotJob({
        jobId: job.id,
        status: "failed",
        errorMessage: publishResult.reason,
      });
      return;
    }

    await syncClient.completeBotJob({
      jobId: job.id,
      status: "success",
      messageId: publishResult.messageId,
      result: {
        channelId: publishResult.channelId,
        messageId: publishResult.messageId,
      },
    });

    logger.success(
      `Bot-Job erfolgreich verarbeitet | id=${job.id} | guild=${job.guildId} | message=${publishResult.messageId}`,
    );
  } catch (error) {
    logger.error("Bot-Job Worker Fehler", error);
  } finally {
    workerRunning = false;
  }
}

export function startDashboardJobWorker(client: Client, config: BotConfig) {
  if (workerStarted) {
    return;
  }

  workerStarted = true;
  const intervalMs = pollIntervalMs();

  logger.info(`Dashboard Bot-Job Worker aktiv | intervalMs=${intervalMs}`);

  void processNextJob(client, config).catch((error) => {
    logger.error("Bot-Job Initiallauf fehlgeschlagen", errorMessage(error));
  });

  const interval = setInterval(() => {
    void processNextJob(client, config);
  }, intervalMs);

  interval.unref?.();
}
