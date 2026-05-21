export type FaqTopicKey =
  | "verify"
  | "tickets"
  | "giveaway"
  | "roles"
  | "creator";

export type FaqTopic = {
  key: FaqTopicKey;
  title: string;
  summary: string;
  steps: readonly string[];
  commands: readonly string[];
  supportHint: string;
};
