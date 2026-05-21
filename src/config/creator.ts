export const creatorButtonIds = {
  stream: "creator:stream",
  video: "creator:video",
  giveaway: "creator:giveaway",
  update: "creator:update",
} as const;

export const creatorButtonIdValues = Object.values(creatorButtonIds);

export const creatorPlaceholderLinks = {
  stream: "https://example.com/stream",
  video: "https://example.com/video",
} as const;
