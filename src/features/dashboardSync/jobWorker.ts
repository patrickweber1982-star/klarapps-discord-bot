import type { Client } from "discord.js";

import type { BotConfig } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import { publishJoinMessageConfigForGuild } from "../joinMessage/joinMessage.js";
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

function readPublishMessageId(result: unknown) {
  if (!result || typeof result !== "object" || !("messageId" in result)) {
    return null;
  }

  const messageId = (result as { messageId?: unknown }).messageId;

  return typeof messageId === "string" ? messageId : null;
}

async function processNextJob(client: Client, config: BotConfig) {
  if (workerRunning) {
    return;
  }

  workerRunning = true;

  try {
    const syncClient = createDashboardSyncClient(config);
    const claim = await syncClient.claimNextBotJob();

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

    const publishResult =
      job.jobType === "VERIFY_PUBLISH" && job.payload.verifyConfig
        ? await publishVerifyPanelForGuild(
            client,
            job.guildId,
            job.payload.verifyConfig,
            job.messageId || job.payload.verifyConfig.publishedMessageId || null,
          )
        : job.jobType === "JOIN_MESSAGE_PUBLISH" &&
            job.payload.joinMessageConfig
          ? await publishJoinMessageConfigForGuild(
              client,
              job.guildId,
              job.payload.joinMessageConfig,
            )
          : {
              ok: false as const,
              reason: "unsupported_job_payload",
            };

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
      messageId: readPublishMessageId(publishResult),
      result: {
        channelId: publishResult.channelId,
        messageId: readPublishMessageId(publishResult),
      },
    });

    logger.success(
      `Bot-Job erfolgreich verarbeitet | id=${job.id} | guild=${job.guildId} | type=${job.jobType}`,
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
