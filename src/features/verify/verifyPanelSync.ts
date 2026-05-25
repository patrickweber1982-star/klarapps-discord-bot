import {
  ActionRowBuilder,
  EmbedBuilder,
  type ButtonBuilder,
  type Client,
} from "discord.js";

import type { BotConfig } from "../../config/env.js";
import { createDashboardSyncClient } from "../dashboardSync/dashboardSyncClient.js";
import { verifyButtonId } from "../../interactions/verifyButton.js";
import { primaryButton } from "../../utils/components.js";
import { logger } from "../../utils/logger.js";

function isDiscordSnowflake(value: string) {
  return /^\d{8,32}$/.test(value);
}

function confirmationText(input: {
  mode: "button" | "emoji";
  emoji: string;
  buttonLabel: string;
}) {
  if (input.mode === "emoji") {
    return `Bestaetigung per Emoji vorbereitet: ${input.emoji || "Emoji noch nicht gesetzt"}`;
  }

  return `Bestaetigung per Button: ${input.buttonLabel || "Verifizieren"}`;
}

export async function sendVerifyPanelForGuild(
  client: Client,
  config: BotConfig,
  guildId: string,
) {
  const syncClient = createDashboardSyncClient(config);
  const result = await syncClient.readVerifyConfig(guildId);

  if (!result.ok) {
    logger.warn(
      `Verify-Panel kann nicht gesendet werden | guild=${guildId} | reason=${result.message}`,
    );
    return {
      ok: false,
      reason: result.message,
    };
  }

  const verifyConfig = result.payload.verifyConfig;

  if (!verifyConfig.verifyChannelId) {
    logger.warn(
      `Verify-Panel wird nicht gesendet | guild=${guildId} | kein Verify-Channel ausgewaehlt`,
    );
    return {
      ok: false,
      reason: "no_channel_selected",
    };
  }

  if (!isDiscordSnowflake(verifyConfig.verifyChannelId)) {
    logger.warn(
      `Verify-Panel wird nicht gesendet | guild=${guildId} | Verify-Channel ist noch kein echter Discord Channel ID`,
    );
    return {
      ok: false,
      reason: "invalid_channel_id",
    };
  }

  const channel = await client.channels.fetch(verifyConfig.verifyChannelId);

  if (!channel || !("send" in channel) || typeof channel.send !== "function") {
    logger.warn(
      `Verify-Panel wird nicht gesendet | guild=${guildId} | Channel nicht sendbar`,
    );
    return {
      ok: false,
      reason: "channel_not_sendable",
    };
  }

  const embed = new EmbedBuilder()
    .setTitle(verifyConfig.embedTitle || "Verify")
    .setDescription(
      [
        verifyConfig.embedDescription ||
          "Bitte bestaetige, um Zugriff auf den Server zu erhalten.",
        "",
        confirmationText({
          mode: verifyConfig.confirmationMode,
          emoji: verifyConfig.confirmationEmoji,
          buttonLabel: verifyConfig.buttonLabel,
        }),
      ].join("\n"),
    )
    .setColor(0x14b8a6)
    .setFooter({ text: verifyConfig.embedFooter || "KlarBot Verify" })
    .setTimestamp();

  const components =
    verifyConfig.confirmationMode === "button"
      ? [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            primaryButton(
              verifyButtonId,
              verifyConfig.buttonLabel || "Verifizieren",
            ),
          ),
        ]
      : [];

  await channel.send({
    embeds: [embed],
    components,
  });

  logger.success(
    `Verify-Panel gesendet | guild=${guildId} | channel=${verifyConfig.verifyChannelId}`,
  );

  return {
    ok: true,
    channelId: verifyConfig.verifyChannelId,
  };
}
