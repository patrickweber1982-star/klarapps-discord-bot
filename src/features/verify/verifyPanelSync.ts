import {
  ActionRowBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  type ButtonBuilder,
  type Client,
} from "discord.js";

import type { BotConfig } from "../../config/env.js";
import {
  createDashboardSyncClient,
  type DashboardVerifyConfig,
} from "../dashboardSync/dashboardSyncClient.js";
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
      ok: false as const,
      reason: result.message,
    };
  }

  const verifyConfig = result.payload.verifyConfig;

  return publishVerifyPanelForGuild(
    client,
    guildId,
    verifyConfig,
    verifyConfig.publishedMessageId || null,
  );
}

export async function publishVerifyPanelForGuild(
  client: Client,
  guildId: string,
  verifyConfig: DashboardVerifyConfig,
  existingMessageId: string | null = null,
) {
  const guild = await client.guilds.fetch(guildId).catch(() => null);

  if (!guild) {
    logger.warn(
      `Verify-Panel wird nicht gesendet | guild=${guildId} | Guild nicht gefunden oder Bot nicht installiert`,
    );
    return {
      ok: false as const,
      reason: "guild_not_found",
    };
  }

  if (!verifyConfig.verifyChannelId) {
    logger.warn(
      `Verify-Panel wird nicht gesendet | guild=${guildId} | kein Verify-Channel ausgewaehlt`,
    );
    return {
      ok: false as const,
      reason: "no_channel_selected",
    };
  }

  if (!verifyConfig.verifiedRoleId) {
    logger.warn(
      `Verify-Panel wird nicht gesendet | guild=${guildId} | keine Verify-Rolle ausgewaehlt`,
    );
    return {
      ok: false as const,
      reason: "missing_verified_role",
    };
  }

  if (verifyConfig.confirmationMode === "emoji") {
    logger.warn(
      `Verify-Panel wird nicht gesendet | guild=${guildId} | Emoji-Modus ist noch vorbereitet`,
    );
    return {
      ok: false as const,
      reason: "emoji_mode_not_ready",
    };
  }

  if (!isDiscordSnowflake(verifyConfig.verifyChannelId)) {
    logger.warn(
      `Verify-Panel wird nicht gesendet | guild=${guildId} | Verify-Channel ist noch kein echter Discord Channel ID`,
    );
    return {
      ok: false as const,
      reason: "invalid_channel_id",
    };
  }

  const channel = await client.channels
    .fetch(verifyConfig.verifyChannelId)
    .catch(() => null);

  if (!channel || !("send" in channel) || typeof channel.send !== "function") {
    logger.warn(
      `Verify-Panel wird nicht gesendet | guild=${guildId} | Channel nicht gefunden oder nicht sendbar`,
    );
    return {
      ok: false as const,
      reason: "channel_not_found",
    };
  }

  if ("guildId" in channel && channel.guildId !== guildId) {
    logger.warn(
      `Verify-Panel wird nicht gesendet | guild=${guildId} | Channel gehoert zu anderer Guild`,
    );
    return {
      ok: false as const,
      reason: "channel_not_found",
    };
  }

  const permissions =
    "permissionsFor" in channel && client.user
      ? channel.permissionsFor(client.user)
      : null;

  if (
    permissions &&
    !permissions.has([
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
    ])
  ) {
    logger.warn(
      `Verify-Panel wird nicht gesendet | guild=${guildId} | fehlende Channel-Berechtigung`,
    );
    return {
      ok: false as const,
      reason: "missing_permissions",
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

  let messageId: string | null = null;
  const panelPayload = {
    embeds: [embed],
    components,
  };

  if (existingMessageId && "messages" in channel) {
    const existingMessage = await channel.messages
      .fetch(existingMessageId)
      .catch(() => null);

    if (existingMessage) {
      const updatedMessage = await existingMessage.edit(panelPayload);
      messageId = updatedMessage.id;
      logger.success(
        `Verify-Panel aktualisiert | guild=${guildId} | channel=${verifyConfig.verifyChannelId} | message=${messageId}`,
      );
    }
  }

  if (!messageId) {
    const sentMessage = await channel.send(panelPayload);
    messageId = sentMessage.id;
    logger.success(
      `Verify-Panel gesendet | guild=${guildId} | channel=${verifyConfig.verifyChannelId} | message=${messageId}`,
    );
  }


  return {
    ok: true as const,
    channelId: verifyConfig.verifyChannelId,
    messageId,
  };
}
