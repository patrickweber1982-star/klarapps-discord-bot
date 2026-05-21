import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";

import { ticketStaffRoleNames } from "../../config/roles.js";
import type { BotCommand } from "../../types/command.js";
import { errorEmbed } from "../../utils/embeds.js";
import { hasAdministrator } from "../../utils/permissions.js";
import { resolveFaqTopic } from "./faqConfig.js";
import {
  buildFaqEmbed,
  buildUnknownFaqTopicEmbed,
} from "./faqEmbeds.js";
import {
  logFaqEmbedSent,
  logFaqInvalidTopic,
  logFaqOpened,
  logFaqTopicSelected,
} from "./faqLogger.js";

const faqPublisherRoleNames = [
  ticketStaffRoleNames[0],
  ticketStaffRoleNames[1],
] as const;

export const faqCommand: BotCommand = {
  name: "faq",
  data: new SlashCommandBuilder()
    .setName("faq")
    .setDescription("Sendet eine KlarBot FAQ-Antwort.")
    .addStringOption((option) =>
      option
        .setName("topic")
        .setDescription("FAQ-Thema: verify, tickets, giveaway, roles oder creator.")
        .setRequired(true)
        .setMaxLength(32),
    ),
  async execute({ interaction }) {
    const requestedTopic = interaction.options.getString("topic", true);
    logFaqOpened(`topic=${requestedTopic} | user=${interaction.user.tag}`);

    if (!interaction.guild) {
      await interaction.reply({
        embeds: [errorEmbed("Dieser Command kann nur auf einem Discord-Server genutzt werden.")],
        ephemeral: true,
      });
      return;
    }

    if (!(await canSendFaq(interaction))) {
      await interaction.reply({
        embeds: [
          errorEmbed(
            "Du brauchst Administratorrechte oder die Rolle 👑 Founder bzw. 🛠️ Developer, um FAQ-Embeds zu senden.",
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    const topic = resolveFaqTopic(requestedTopic);

    if (!topic) {
      logFaqInvalidTopic(
        `topic=${requestedTopic} | user=${interaction.user.tag} | guild=${interaction.guild.name}`,
      );
      await interaction.reply({
        embeds: [buildUnknownFaqTopicEmbed(requestedTopic)],
        ephemeral: true,
      });
      return;
    }

    logFaqTopicSelected(
      `topic=${topic.key} | user=${interaction.user.tag} | guild=${interaction.guild.name}`,
    );

    await interaction.reply({
      embeds: [buildFaqEmbed(topic)],
    });

    logFaqEmbedSent(
      `topic=${topic.key} | channel=${interaction.channel?.id ?? "unknown"} | guild=${interaction.guild.name}`,
    );
  },
};

async function canSendFaq(interaction: ChatInputCommandInteraction) {
  if (hasAdministrator(interaction)) {
    return true;
  }

  const member = await interaction.guild?.members.fetch(interaction.user.id).catch(() => null);

  if (!member) {
    return false;
  }

  return faqPublisherRoleNames.some((roleName) =>
    member.roles.cache.some((role) => role.name === roleName),
  );
}
