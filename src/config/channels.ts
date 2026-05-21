export const rulesChannelName = "📜・regeln";
export const klarBotGuideChannelName = "🤖・so-funktioniert-klarbot";
export const welcomeChannelName = "👋・willkommen";
export const supportHintChannelName = "🎫・support";
export const ticketLogChannelName = "📋・ticket-logs";
export const rolesOverviewChannelName = "🎭・rollen";

export const verifyPanelChannelNames = [welcomeChannelName, rulesChannelName] as const;

export const infoCategoryName = "📢 INFO";
export const supportCategoryName = "🛠️ SUPPORT";
export const moderationCategoryName = "👮 MODERATION";
export const moderationLogChannelName = "📋・mod-logs";
export const voiceCategoryName = "🔊 VOICE";

export const setupCategoryDefinitions = [
  {
    name: infoCategoryName,
    access: "info",
    channels: [
      { name: rulesChannelName, access: "rules" },
      { name: klarBotGuideChannelName, access: "botGuide" },
      { name: welcomeChannelName, access: "info" },
      { name: "📢・ankündigungen", access: "info" },
      { name: "🗺️・roadmap", access: "info" },
      { name: rolesOverviewChannelName, access: "info" },
    ],
  },
  {
    name: "💬 COMMUNITY",
    access: "community",
    channels: [
      { name: "💬・allgemein", access: "community" },
      { name: "🧠・ideen-feedback", access: "community" },
      { name: "🎨・showcase", access: "community" },
      { name: "❓・hilfe-community", access: "community" },
    ],
  },
  {
    name: supportCategoryName,
    access: "community",
    channels: [
      { name: supportHintChannelName, access: "community" },
      { name: "🐞・bug-reports", access: "community" },
      { name: "💡・feature-wünsche", access: "community" },
      { name: ticketLogChannelName, access: "ticketLogs" },
    ],
  },
  {
    name: "🤖 KLARAPPS",
    access: "community",
    channels: [
      { name: "💰・klargeld", access: "community" },
      { name: "🏥・mobile-pflege", access: "community" },
      { name: "💪・fitness-app", access: "community" },
    ],
  },
  {
    name: "🔒 KUNDENBEREICH",
    access: "customer",
    channels: [
      { name: "⬇️・downloads", access: "customer" },
      { name: "✨・pro-features", access: "customer" },
      { name: "🧪・beta-tests", access: "customer" },
    ],
  },
  {
    name: moderationCategoryName,
    access: "team",
    channels: [
      { name: moderationLogChannelName, access: "team" },
    ],
  },
  {
    name: voiceCategoryName,
    access: "voice",
    channels: [
      { name: "🔊・Allgemein", access: "voice", type: "voice" },
      { name: "🎙️・Support Talk", access: "voice", type: "voice" },
      { name: "🎮・Community Talk", access: "voice", type: "voice" },
    ],
  },
] as const;

export type SetupAccess =
  (typeof setupCategoryDefinitions)[number]["channels"][number]["access"];
