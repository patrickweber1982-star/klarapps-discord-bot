import type { ButtonInteraction } from "discord.js";

import { getGiveawayIdFromButton } from "../config/giveaways.js";
import { communityEmbed, errorEmbed } from "../utils/embeds.js";
import { registerGiveawayParticipant } from "../utils/giveaways.js";

export async function handleGiveawayButton(interaction: ButtonInteraction) {
  const giveawayId = getGiveawayIdFromButton(interaction.customId);

  if (!giveawayId) {
    return false;
  }

  const result = registerGiveawayParticipant(giveawayId, interaction.user.id);

  if (result.status === "missing" || result.status === "ended") {
    await interaction.reply({
      embeds: [errorEmbed("Dieses Giveaway ist nicht mehr aktiv.")],
      ephemeral: true,
    });
    return true;
  }

  if (result.status === "duplicate") {
    await interaction.reply({
      embeds: [communityEmbed("Du bist bereits eingetragen.", "Giveaway")],
      ephemeral: true,
    });
    return true;
  }

  await interaction.reply({
    embeds: [communityEmbed("Du nimmst am Giveaway teil.", "Giveaway")],
    ephemeral: true,
  });

  return true;
}
