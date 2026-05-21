import { randomUUID } from "node:crypto";

import type { TextChannel, User } from "discord.js";

import { giveawayWinnerEmbed } from "./embeds.js";
import { logger } from "./logger.js";

type GiveawayChannel = Pick<TextChannel, "send">;

export type GiveawayEntry = {
  id: string;
  prize: string;
  winners: number;
  hostId: string;
  hostTag: string;
  endAt: Date;
  participants: Set<string>;
  channel: GiveawayChannel;
  timeout: NodeJS.Timeout;
};

export type CreateGiveawayOptions = {
  prize: string;
  durationMinutes: number;
  winners: number;
  host: User;
  channel: GiveawayChannel;
};

const activeGiveaways = new Map<string, GiveawayEntry>();

export function createGiveaway(options: CreateGiveawayOptions) {
  const id = randomUUID();
  const endAt = new Date(Date.now() + options.durationMinutes * 60_000);

  const giveaway: GiveawayEntry = {
    id,
    prize: options.prize,
    winners: options.winners,
    hostId: options.host.id,
    hostTag: options.host.tag,
    endAt,
    participants: new Set<string>(),
    channel: options.channel,
    timeout: setTimeout(() => {
      void finishGiveaway(id);
    }, options.durationMinutes * 60_000),
  };

  giveaway.timeout.unref?.();
  activeGiveaways.set(id, giveaway);
  logger.giveaway(`Giveaway erstellt: ${options.prize} von ${options.host.tag}`);

  return giveaway;
}

export function registerGiveawayParticipant(giveawayId: string, userId: string) {
  const giveaway = activeGiveaways.get(giveawayId);

  if (!giveaway) {
    return { status: "missing" as const };
  }

  if (Date.now() >= giveaway.endAt.getTime()) {
    return { status: "ended" as const };
  }

  if (giveaway.participants.has(userId)) {
    return { status: "duplicate" as const, giveaway };
  }

  giveaway.participants.add(userId);
  logger.giveaway(`Teilnehmer registriert: ${userId} fuer ${giveaway.prize}`);

  return { status: "joined" as const, giveaway };
}

async function finishGiveaway(giveawayId: string) {
  const giveaway = activeGiveaways.get(giveawayId);

  if (!giveaway) {
    return;
  }

  activeGiveaways.delete(giveawayId);

  const winners = pickWinners([...giveaway.participants], giveaway.winners);
  const winnerText = winners.length
    ? winners.map((winnerId) => `<@${winnerId}>`).join("\n")
    : "Keine gültigen Teilnehmer.";

  await giveaway.channel
    .send({
      embeds: [
        giveawayWinnerEmbed(
          [
            `**Preis:** ${giveaway.prize}`,
            "",
            "**Gewinner**",
            winnerText,
          ].join("\n"),
          "🎉 Giveaway beendet",
        ).setFooter({ text: "KlarBot Giveaway System" }),
      ],
    })
    .catch((error) => {
      logger.error(`Giveaway-Ergebnis konnte nicht gepostet werden: ${giveaway.prize}`, error);
    });

  logger.giveaway(
    winners.length
      ? `Gewinner gezogen: ${winners.join(", ")} fuer ${giveaway.prize}`
      : `Giveaway beendet ohne Teilnehmer: ${giveaway.prize}`,
  );
}

function pickWinners(participants: string[], winnerCount: number) {
  const shuffled = [...participants];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled.slice(0, Math.min(winnerCount, shuffled.length));
}
