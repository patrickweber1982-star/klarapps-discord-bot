import { errorEmbed, faqEmbed } from "../../utils/embeds.js";
import { FAQ_TOPIC_KEYS } from "./faqConfig.js";
import type { FaqTopic } from "./types.js";

export function buildFaqEmbed(topic: FaqTopic) {
  return faqEmbed(
    [
      topic.summary,
      "",
      "**Schritte**",
      ...topic.steps.map((step) => `• ${step}`),
      "",
      "**Wichtige Commands**",
      topic.commands.map((command) => `\`${command}\``).join("  "),
      "",
      `**Support-Hinweis:** ${topic.supportHint}`,
    ].join("\n"),
    topic.title,
  );
}

export function buildUnknownFaqTopicEmbed(topic: string) {
  return errorEmbed(
    [
      `Das FAQ-Thema \`${topic}\` ist nicht bekannt.`,
      "",
      "**Verfuegbare Themen**",
      FAQ_TOPIC_KEYS.map((key) => `\`${key}\``).join("  "),
    ].join("\n"),
    "FAQ Thema nicht gefunden",
  );
}
