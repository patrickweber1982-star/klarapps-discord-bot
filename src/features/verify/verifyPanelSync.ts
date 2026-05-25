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
import { verifyButtonPrefix } from "../../interactions/verifyButton.js";
import { primaryButton } from "../../utils/components.js";
import { logger } from "../../utils/logger.js";

function isDiscordSnowflake(value: string) {
  return /^\d{8,32}$/.test(value);
}

function configuredEmoji(value: string | undefined) {
  const normalized = value?.trim();

  if (!normalized) {
    return "";
  }

  const knownEmojis: Record<string, string> = {
    check: "✅",
    "thumbs-up": "👍",
    star: "⭐",
    lock: "🔒",
    gaming: "🎮",
  };

  return knownEmojis[normalized] ?? normalized;
}

function embedColor(value: string | undefined) {
  const colors: Record<string, number> = {
    "klarapps-teal": 0x14b8a6,
    blue: 0x3b82f6,
    purple: 0xa855f7,
    green: 0x22c55e,
    yellow: 0xeab308,
    red: 0xef4444,
    gray: 0x64748b,
  };

  return colors[value?.trim() ?? ""] ?? colors["klarapps-teal"];
}

function embedImageUrl(value: string | undefined) {
  const url = value?.trim();

  if (!url || !/^https?:\/\//i.test(url)) {
    return "";
  }

  return url;
}

function optionalBlock(title: string, value: string | undefined) {
  const text = value?.trim();

  if (!text) {
    return [];
  }

  return [`**${title}**`, text, ""];
}

function confirmationText(input: {
  mode: "button" | "emoji";
  emoji: string;
  buttonLabel: string;
  confirmationHint?: string;
}) {
  const hint = input.confirmationHint?.trim();

  if (input.mode === "emoji") {
    return [
      `Bestaetigung per Emoji vorbereitet: ${
        configuredEmoji(input.emoji) || "Emoji noch nicht gesetzt"
      }`,
      hint,
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    `Bestaetigung per Button: ${input.buttonLabel || "Verifizieren"}`,
    hint,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildVerifyDescription(verifyConfig: DashboardVerifyConfig) {
  return [
    ...optionalBlock("Beschreibung", verifyConfig.channelDescription),
    verifyConfig.embedDescription ||
      "Bitte bestaetige, um Zugriff auf den Server zu erhalten.",
    "",
    ...optionalBlock("Channel-Hinweis", verifyConfig.channelHint),
    confirmationText({
      mode: verifyConfig.confirmationMode,
      emoji: verifyConfig.confirmationEmoji,
      buttonLabel: verifyConfig.buttonLabel,
      confirmationHint: verifyConfig.confirmationHint,
    }),
    "",
    ...optionalBlock("Rollenhinweis", verifyConfig.roleHint),
  ]
    .filter((line, index, lines) => {
      if (line !== "") {
        return true;
      }

      return lines[index - 1] !== "" && lines[index + 1] !== "";
    })
    .join("\n");
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
    .setDescription(buildVerifyDescription(verifyConfig))
    .setColor(embedColor(verifyConfig.embedColor))
    .setFooter({ text: verifyConfig.embedFooter || "KlarBot Verify" })
    .setTimestamp();
  const bannerImageUrl = embedImageUrl(verifyConfig.bannerImageUrl);

  if (bannerImageUrl) {
    embed.setImage(bannerImageUrl);
  }

  const verifyButton = primaryButton(
    `${verifyButtonPrefix}:${guildId}`,
    verifyConfig.buttonLabel || "Verifizieren",
  );
  const emoji = configuredEmoji(verifyConfig.confirmationEmoji);

  if (emoji) {
    verifyButton.setEmoji(emoji);
  }

  const components =
    verifyConfig.confirmationMode === "button"
      ? [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            verifyButton,
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

  if (verifyConfig.confirmationMode === "button" && "messages" in channel) {
    const message = await channel.messages.fetch(messageId).catch(() => null);

    if (message) {
      const preciseButton = primaryButton(
        `${verifyButtonPrefix}:${guildId}:${messageId}`,
        verifyConfig.buttonLabel || "Verifizieren",
      );
      const emoji = configuredEmoji(verifyConfig.confirmationEmoji);

      if (emoji) {
        preciseButton.setEmoji(emoji);
      }

      await message.edit({
        embeds: [embed],
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(preciseButton),
        ],
      });
    }
  }

  if (verifyConfig.confirmationMode === "emoji" && "messages" in channel) {
    const emoji = configuredEmoji(verifyConfig.confirmationEmoji) || "✅";
    const message = await channel.messages.fetch(messageId).catch(() => null);

    if (message) {
      await message.react(emoji).catch((error) => {
        logger.warn(
          `Verify-Emoji konnte nicht gesetzt werden | guild=${guildId} | message=${messageId}`,
          error,
        );
      });
    }
  }

  return {
    ok: true as const,
    channelId: verifyConfig.verifyChannelId,
    messageId,
  };
}
