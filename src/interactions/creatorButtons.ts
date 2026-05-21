import {
  ActionRowBuilder,
  type ButtonBuilder,
  type ButtonInteraction,
} from "discord.js";

import {
  creatorButtonIds,
  creatorButtonIdValues,
  creatorPlaceholderLinks,
} from "../config/creator.js";
import { linkButton } from "../utils/components.js";
import {
  creatorEmbed,
  errorEmbed,
  giveawayEmbed,
  livestreamEmbed,
  videoEmbed,
} from "../utils/embeds.js";
import { logger } from "../utils/logger.js";
import { canModerateMember, moderationPermissionMessage } from "../utils/permissions.js";

export async function handleCreatorButton(interaction: ButtonInteraction) {
  if (!creatorButtonIdValues.includes(interaction.customId as (typeof creatorButtonIdValues)[number])) {
    return false;
  }

  if (!interaction.guild) {
    await interaction.reply({
      embeds: [errorEmbed("Creator-Aktionen funktionieren nur auf einem Discord-Server.")],
      ephemeral: true,
    });
    return true;
  }

  const member = await interaction.guild.members.fetch(interaction.user.id);

  if (!canModerateMember(member)) {
    await interaction.reply({
      embeds: [errorEmbed(moderationPermissionMessage())],
      ephemeral: true,
    });
    return true;
  }

  if (interaction.customId === creatorButtonIds.stream) {
    await announceStream(interaction);
    return true;
  }

  if (interaction.customId === creatorButtonIds.video) {
    await announceVideo(interaction);
    return true;
  }

  if (interaction.customId === creatorButtonIds.giveaway) {
    await announceGiveaway(interaction);
    return true;
  }

  if (interaction.customId === creatorButtonIds.update) {
    await announceCommunityUpdate(interaction);
    return true;
  }

  return false;
}

async function announceStream(interaction: ButtonInteraction) {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    linkButton("🎥 Stream ansehen", creatorPlaceholderLinks.stream),
  );

  await interaction.reply({
    embeds: [
      livestreamEmbed(
        [
          `${interaction.user} ist jetzt live!`,
          "",
          "Schau vorbei, unterstütze den Stream und sei live in der Community dabei.",
          "",
          "Hinweis: Der Link ist ein Platzhalter, bis Creator-Links per Modal gepflegt werden.",
        ].join("\n"),
        "🔴 LIVE NOW",
      ),
    ],
    components: [row],
  });

  logger.creator(`Stream-Ankündigung erstellt von ${interaction.user.tag}`);
}

async function announceVideo(interaction: ButtonInteraction) {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    linkButton("▶ Jetzt ansehen", creatorPlaceholderLinks.video),
  );

  await interaction.reply({
    embeds: [
      videoEmbed(
        [
          `${interaction.user} hat ein neues Video veröffentlicht.`,
          "",
          "Nimm dir einen Moment, schau rein und teile dein Feedback mit der Community.",
          "",
          "Hinweis: Der Link ist ein Platzhalter, bis Video-Links per Modal gepflegt werden.",
        ].join("\n"),
        "📹 Neues Video online",
      ),
    ],
    components: [row],
  });

  logger.creator(`Video-Ankündigung erstellt von ${interaction.user.tag}`);
}

async function announceGiveaway(interaction: ButtonInteraction) {
  await interaction.reply({
    embeds: [
      giveawayEmbed(
        [
          "Reagiere oder klicke, um teilzunehmen.",
          "",
          "Dieses Giveaway-Panel ist vorbereitet. Auswertung, Laufzeit und Gewinnerlogik folgen in einer späteren Version.",
        ].join("\n"),
        "🎁 Giveaway gestartet",
      ),
    ],
  });

  logger.creator(`Giveaway gestartet von ${interaction.user.tag}`);
}

async function announceCommunityUpdate(interaction: ButtonInteraction) {
  await interaction.reply({
    embeds: [
      creatorEmbed(
        [
          "Neue Informationen wurden veröffentlicht.",
          "",
          "Halte die Augen offen und schau regelmäßig in die aktuellen Community-Channels.",
        ].join("\n"),
        "📢 Community Update",
      ),
    ],
  });

  logger.creator(`Community Update erstellt von ${interaction.user.tag}`);
}
