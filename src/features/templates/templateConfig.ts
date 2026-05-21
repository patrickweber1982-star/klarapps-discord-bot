import type { CreatorTemplateDefinition, TemplateKey } from "./templateTypes.js";

export const creatorTemplates: Record<TemplateKey, CreatorTemplateDefinition> = {
  twitch: {
    key: "twitch",
    label: "Twitch Creator",
    categories: ["📢 STREAM INFO", "💬 COMMUNITY", "🎬 CLIPS & MEDIA", "🎫 SUPPORT", "🔊 VOICE"],
    channels: [
      { name: "📢・stream-ankündigungen", category: "📢 STREAM INFO" },
      { name: "🎬・clips", category: "🎬 CLIPS & MEDIA" },
      { name: "💜・live-chat", category: "💬 COMMUNITY" },
      { name: "🎮・mitspieler-suche", category: "💬 COMMUNITY" },
      { name: "📸・screenshots", category: "🎬 CLIPS & MEDIA" },
      { name: "💬・allgemein", category: "💬 COMMUNITY" },
      { name: "🎫・support", category: "🎫 SUPPORT" },
      { name: "🔊・Stream Lounge", category: "🔊 VOICE", type: "voice" },
      { name: "🎮・Gaming Talk", category: "🔊 VOICE", type: "voice" },
    ],
    roles: [
      { name: "🔴 Live Ping", color: 0xef4444 },
      { name: "💜 Twitch Zuschauer", color: 0x9146ff },
      { name: "⭐ Stammzuschauer", color: 0xfacc15, hoist: true },
      { name: "🎮 Gamer", color: 0x22c55e },
    ],
  },
  youtube: {
    key: "youtube",
    label: "YouTube Creator",
    categories: ["📢 VIDEO INFO", "💬 COMMUNITY", "💡 CONTENT IDEEN", "🎫 SUPPORT", "🔊 VOICE"],
    channels: [
      { name: "🎥・neue-videos", category: "📢 VIDEO INFO" },
      { name: "💡・video-ideen", category: "💡 CONTENT IDEEN" },
      { name: "🧠・feedback", category: "💡 CONTENT IDEEN" },
      { name: "📊・umfragen", category: "💬 COMMUNITY" },
      { name: "💬・allgemein", category: "💬 COMMUNITY" },
      { name: "🎬・shorts-clips", category: "💬 COMMUNITY" },
      { name: "🎫・support", category: "🎫 SUPPORT" },
      { name: "🔊・Community Talk", category: "🔊 VOICE", type: "voice" },
    ],
    roles: [
      { name: "🔔 Video Ping", color: 0xef4444 },
      { name: "🎥 YouTube Zuschauer", color: 0xff0000 },
      { name: "💡 Ideen-Geber", color: 0xf59e0b },
      { name: "⭐ Stammzuschauer", color: 0xfacc15, hoist: true },
    ],
  },
  indiedev: {
    key: "indiedev",
    label: "Indie Dev",
    categories: ["📢 PROJEKT INFO", "💬 COMMUNITY", "🧪 TESTING", "🛠️ SUPPORT", "🔊 VOICE"],
    channels: [
      { name: "📢・ankündigungen", category: "📢 PROJEKT INFO" },
      { name: "🗺️・roadmap", category: "📢 PROJEKT INFO" },
      { name: "📝・changelog", category: "📢 PROJEKT INFO" },
      { name: "🐞・bug-reports", category: "🧪 TESTING" },
      { name: "💡・feature-wünsche", category: "💬 COMMUNITY" },
      { name: "🧪・beta-tests", category: "🧪 TESTING" },
      { name: "💬・allgemein", category: "💬 COMMUNITY" },
      { name: "🎫・support", category: "🛠️ SUPPORT" },
      { name: "🔊・Dev Talk", category: "🔊 VOICE", type: "voice" },
    ],
    roles: [
      { name: "🧪 Beta Tester", color: 0x3498db },
      { name: "💡 Feedback", color: 0xf59e0b },
      { name: "🐞 Bug Reporter", color: 0xef4444 },
      { name: "💻 Developer", color: 0x5865f2 },
    ],
  },
  support: {
    key: "support",
    label: "Support Server",
    categories: ["📢 INFO", "🛠️ SUPPORT", "👥 COMMUNITY", "🔒 KUNDENBEREICH", "🔊 VOICE"],
    channels: [
      { name: "📢・ankündigungen", category: "📢 INFO" },
      { name: "❓・faq", category: "📢 INFO" },
      { name: "🎫・support", category: "🛠️ SUPPORT" },
      { name: "🐞・bug-reports", category: "🛠️ SUPPORT" },
      { name: "💡・feature-wünsche", category: "🛠️ SUPPORT" },
      { name: "💬・allgemein", category: "👥 COMMUNITY" },
      { name: "⬇️・downloads", category: "🔒 KUNDENBEREICH" },
      { name: "✨・pro-features", category: "🔒 KUNDENBEREICH" },
      { name: "🔊・Support Talk", category: "🔊 VOICE", type: "voice" },
    ],
    roles: [
      { name: "💎 Kunde", color: 0x2ecc71 },
      { name: "✨ Pro Kunde", color: 0x9b59b6 },
      { name: "🧪 Beta Tester", color: 0x3498db },
      { name: "🤝 Supporter", color: 0x57f287 },
    ],
  },
};

export const availableTemplateKeys = Object.keys(creatorTemplates) as TemplateKey[];
