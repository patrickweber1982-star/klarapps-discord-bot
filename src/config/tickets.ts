export type TicketType = "support" | "bug" | "feature";

export type TicketTypeDefinition = {
  type: TicketType;
  label: string;
  buttonLabel: string;
  description: string;
};

export const ticketButtonIds = {
  support: "ticket:create:support",
  bug: "ticket:create:bug",
  feature: "ticket:create:feature",
  close: "ticket:close",
} as const;

export const ticketTypes: Record<TicketType, TicketTypeDefinition> = {
  support: {
    type: "support",
    label: "Support",
    buttonLabel: "🛠️ Support",
    description: "Beschreibe dein Anliegen moeglichst konkret. Das KlarApps Team hilft dir weiter.",
  },
  bug: {
    type: "bug",
    label: "Bug Report",
    buttonLabel: "🐞 Bug Report",
    description:
      "Beschreibe den Fehler, Schritte zur Reproduktion und welche KlarApps Funktion betroffen ist.",
  },
  feature: {
    type: "feature",
    label: "Feature-Wunsch",
    buttonLabel: "💡 Feature-Wunsch",
    description:
      "Beschreibe deine Idee und welchen Nutzen sie fuer KlarApps Nutzer haette.",
  },
};

export const ticketTopicPrefix = "klarbot-ticket";
