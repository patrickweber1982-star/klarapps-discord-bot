import type { FaqTopic, FaqTopicKey } from "./types.js";

export const FAQ_TOPICS: Record<FaqTopicKey, FaqTopic> = {
  verify: {
    key: "verify",
    title: "✅ FAQ - Verify System",
    summary: "So schalten neue Mitglieder Schritt fuer Schritt die Community frei.",
    steps: [
      "📜 Regeln im Regeln-Channel lesen und akzeptieren.",
      "🚀 KlarBot-Erklaerung bestaetigen und Community freischalten.",
      "🎭 Danach passende Rollen ueber das Rollenpanel waehlen.",
    ],
    commands: ["/help", "/verify", "/roles-panel"],
    supportHint: "Wenn die Freischaltung nicht klappt, oeffne ein Support-Ticket.",
  },
  tickets: {
    key: "tickets",
    title: "🎫 FAQ - Tickets",
    summary: "Tickets sind fuer Support, Bugs und konkrete Fragen gedacht.",
    steps: [
      "🎫 Im Support-Panel die passende Kategorie waehlen.",
      "🧾 Anliegen klar beschreiben und wichtige Infos direkt mitschicken.",
      "🔒 Ticket schliessen, sobald alles erledigt ist.",
    ],
    commands: ["/tickets", "/help"],
    supportHint: "Nutze Tickets fuer private Anliegen, Bugs oder Themen mit Team-Unterstuetzung.",
  },
  giveaway: {
    key: "giveaway",
    title: "🎁 FAQ - Giveaways",
    summary: "Giveaways helfen Creator-Communities bei einfachen Aktionen und Verlosungen.",
    steps: [
      "🎉 Mit dem Teilnahme-Button ins Giveaway eintragen.",
      "🔁 Doppelte Teilnahmen werden automatisch verhindert.",
      "🏆 Gewinner werden nach Ablauf automatisch gezogen.",
    ],
    commands: ["/giveaway", "/roles-panel"],
    supportHint: "Aktiviere Giveaway-Ping-Rollen, wenn du keine Aktionen verpassen moechtest.",
  },
  roles: {
    key: "roles",
    title: "🎭 FAQ - Rollen",
    summary: "Rollen steuern Interessen, Pings und Community-Bereiche.",
    steps: [
      "🎬 Plattformrollen fuer YouTube, Twitch oder TikTok waehlen.",
      "🎮 Interessenrollen wie Gaming, Development oder Design aktivieren.",
      "🔔 Ping-Rollen fuer Updates, Giveaways und Events nutzen.",
    ],
    commands: ["/roles-panel", "/roles", "/help"],
    supportHint: "Klicke erneut auf eine Rolle, um sie wieder zu entfernen.",
  },
  creator: {
    key: "creator",
    title: "🎬 FAQ - Creator Setup",
    summary: "KlarBot unterstuetzt Creator-Server mit Templates und Community-Workflows.",
    steps: [
      "📦 Creator Templates ueber Setup kombinieren, z. B. Twitch und YouTube.",
      "📢 Creator Panel fuer Stream-, Video- und Community-Updates senden.",
      "🎫 Tickets, Rollen und Giveaways als Basis fuer die Community nutzen.",
    ],
    commands: ["/setup templates:twitch,youtube", "/creator-panel", "/giveaway"],
    supportHint: "Twitch- und YouTube-API-Anbindungen sind vorbereitet, aber noch nicht aktiv.",
  },
};

export const FAQ_TOPIC_KEYS = Object.keys(FAQ_TOPICS) as FaqTopicKey[];

export const FAQ_TOPIC_ALIASES: Record<string, FaqTopicKey> = {
  ticket: "tickets",
  support: "tickets",
  giveaways: "giveaway",
  rolle: "roles",
  rollen: "roles",
  setup: "creator",
  templates: "creator",
};

export function resolveFaqTopic(input: string) {
  const normalizedTopic = input.trim().toLowerCase();

  if (isFaqTopicKey(normalizedTopic)) {
    return FAQ_TOPICS[normalizedTopic];
  }

  const alias = FAQ_TOPIC_ALIASES[normalizedTopic];
  return alias ? FAQ_TOPICS[alias] : null;
}

function isFaqTopicKey(value: string): value is FaqTopicKey {
  return FAQ_TOPIC_KEYS.includes(value as FaqTopicKey);
}
