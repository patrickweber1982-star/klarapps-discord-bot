import { Events, type Client, type MessageReaction, type User } from "discord.js";

import type { BotConfig } from "../config/env.js";
import { createDashboardSyncClient } from "../features/dashboardSync/dashboardSyncClient.js";
import { verifyCommunityMember } from "../features/welcome/verifyFlow.js";
import { logger } from "../utils/logger.js";

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

function reactionEmojiValue(reaction: MessageReaction) {
  return reaction.emoji.id ?? reaction.emoji.name ?? "";
}

export function registerMessageReactionAddEvent(
  client: Client,
  config: BotConfig,
) {
  client.on(Events.MessageReactionAdd, async (reaction, user) => {
    if (user.bot) {
      return;
    }

    try {
      const fullReaction = reaction.partial
        ? await reaction.fetch()
        : reaction;
      const fullUser = user.partial ? await user.fetch() : (user as User);
      const guild = fullReaction.message.guild;

      if (!guild) {
        return;
      }

      const syncClient = createDashboardSyncClient(config);
      const verifyConfigResult = await syncClient.readVerifyConfig(guild.id);

      if (!verifyConfigResult.ok) {
        logger.warn(
          `Verify-Reaktion ignoriert: Config konnte nicht geladen werden | guild=${guild.id} | reason=${verifyConfigResult.message}`,
        );
        return;
      }

      const verifyConfig = verifyConfigResult.payload.verifyConfig;

      if (!verifyConfig.enabled) {
        logger.warn(
          `Verify-Reaktion ignoriert: Modul deaktiviert | guild=${guild.id}`,
        );
        return;
      }

      if (
        verifyConfig.confirmationMode !== "emoji" ||
        verifyConfig.publishedMessageId !== fullReaction.message.id
      ) {
        return;
      }

      const expectedEmoji = configuredEmoji(verifyConfig.confirmationEmoji) || "✅";

      if (reactionEmojiValue(fullReaction) !== expectedEmoji) {
        return;
      }

      const member = await guild.members.fetch(fullUser.id);

      const result = await verifyCommunityMember(member, {
        verifiedRoleId: verifyConfig.verifiedRoleId,
        removeRoleId: verifyConfig.removeRoleId,
      });

      if (!result.ok) {
        logger.warn(
          `Verify per Emoji fehlgeschlagen | guild=${guild.id} | user=${fullUser.id} | reason=${result.message}`,
        );
        return;
      }

      logger.success(
        `Verify per Emoji abgeschlossen | guild=${guild.id} | user=${fullUser.id}`,
      );
    } catch (error) {
      logger.error("Verify-Reaktion konnte nicht verarbeitet werden", error);
    }
  });
}
