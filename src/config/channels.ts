export const verifyPanelChannelNames = ["👋・willkommen", "📜・regeln"] as const;

export const supportCategoryName = "🛠️ SUPPORT";
export const moderationCategoryName = "👮 MODERATION";
export const moderationLogChannelName = "📋・mod-logs";

export const setupCategoryDefinitions = [
  {
    name: "✨ START HERE",
    writable: false,
    channels: ["👋・willkommen", "📢・ankündigungen", "📜・regeln"],
  },
  {
    name: "💬 COMMUNITY",
    writable: true,
    channels: ["💬・allgemein", "🧠・ideen-feedback"],
  },
  {
    name: supportCategoryName,
    writable: true,
    channels: ["🎫・support", "🐞・bug-reports"],
  },
  {
    name: "🚀 KLARAPPS",
    writable: true,
    channels: ["💰・klargeld", "🏥・mobile-pflege"],
  },
] as const;
