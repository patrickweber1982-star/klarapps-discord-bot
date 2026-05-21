export const giveawayButtonPrefix = "giveaway:join";

export function buildGiveawayJoinButtonId(giveawayId: string) {
  return `${giveawayButtonPrefix}:${giveawayId}`;
}

export function getGiveawayIdFromButton(customId: string) {
  if (!customId.startsWith(`${giveawayButtonPrefix}:`)) {
    return null;
  }

  return customId.slice(giveawayButtonPrefix.length + 1);
}
