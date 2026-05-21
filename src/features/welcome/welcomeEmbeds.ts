import type { Guild, GuildMember, User } from "discord.js";

import {
  communityEmbed,
  errorEmbed,
  onboardingEmbed,
  rolesEmbed,
  successEmbed,
} from "../../utils/embeds.js";

export function buildMemberWelcomeEmbed(member: GuildMember) {
  return onboardingEmbed(
    [
      `Willkommen ${member.user} auf **${member.guild.name}**.`,
      "",
      "**Dein Start**",
      "📜 Regeln lesen",
      "✅ Verify abschließen",
      "💬 Community freischalten",
      "🎮 Rollen wählen",
      "🎫 Support erhalten",
      "",
      "Starte in den Regeln und folge den Buttons. Alles ist kurz und mobilfreundlich aufgebaut.",
    ].join("\n"),
    "👋 Willkommen",
  );
}

export function buildWelcomeChannelEmbed(guildName: string) {
  return onboardingEmbed(
    [
      `Willkommen bei **${guildName}**.`,
      "",
      "**So kommst du rein**",
      "1. 📜 Regeln lesen",
      "2. ✅ Community freischalten",
      "3. 🎭 Rollen wählen",
      "4. 💬 Server nutzen",
      "",
      "KlarBot begleitet dich durch die wichtigsten Schritte.",
    ].join("\n"),
    "👋 Willkommen",
  );
}

export function buildRulesEmbed() {
  return onboardingEmbed(
    [
      "Bitte bestätige die Regeln, bevor du Zugriff auf weitere Bereiche erhältst.",
      "",
      "• Sei respektvoll.",
      "• Kein Spam.",
      "• Keine Werbung ohne Erlaubnis.",
      "• Keine beleidigenden Inhalte.",
      "• Support-Anfragen bitte über Tickets.",
      "",
      "**Fortschritt**",
      "⬜ Regeln akzeptiert",
      "⬜ Community freigeschaltet",
      "⬜ Rollen gewählt",
    ].join("\n"),
    "📜 Serverregeln",
  );
}

export function buildKlarBotGuideEmbed() {
  return onboardingEmbed(
    [
      "KlarBot verbindet Serverstruktur, Support, Creator-Workflows und Rollen in einem klaren System.",
      "",
      "**Was du nutzen kannst**",
      "• `/help` zeigt dir die Übersicht.",
      "• `/tickets` öffnet den Support.",
      "• `/roles-panel` zeigt Interessenrollen.",
      "• `/creator-panel` unterstützt Creator-Updates.",
      "",
      "**Fortschritt**",
      "✅ Regeln akzeptiert",
      "⬜ Community freigeschaltet",
      "⬜ Rollen gewählt",
    ].join("\n"),
    "🤖 So funktioniert KlarBot",
  );
}

export function buildVerifyPanelEmbed(guild: Guild) {
  return onboardingEmbed(
    [
      `Schalte dir den Community-Zugriff auf **${guild.name}** frei.`,
      "",
      "**Nach dem Klick bekommst du:**",
      "💬 Community-Bereiche",
      "🎫 Support-Zugang",
      "🎭 Rollen- und Interessenbereiche",
      "",
      "Klicke auf den Button, wenn du bereit bist.",
    ].join("\n"),
    "✅ Community freischalten",
  );
}

export function buildRulesAcceptedEmbed() {
  return successEmbed(
    [
      "✅ Regeln akzeptiert",
      "",
      "**Nächster Schritt**",
      "Lies jetzt die KlarBot-Erklärung und schalte danach die Community frei.",
      "",
      "**Fortschritt**",
      "✅ Regeln akzeptiert",
      "⬜ Community freigeschaltet",
      "⬜ Rollen gewählt",
    ].join("\n"),
    "Onboarding aktualisiert",
  );
}

export function buildCommunityUnlockedEmbed(user: User) {
  return communityEmbed(
    [
      `Willkommen in der Community, ${user}.`,
      "",
      "**Nächster Schritt**",
      "Wähle passende Rollen über `/roles-panel`, damit Updates, Creator-Themen und Interessen besser zu dir passen.",
      "",
      "**Fortschritt**",
      "✅ Regeln akzeptiert",
      "✅ Community freigeschaltet",
      "⬜ Rollen gewählt",
    ].join("\n"),
    "Community freigeschaltet",
  );
}

export function buildAlreadyVerifiedEmbed() {
  return communityEmbed(
    [
      "Du bist bereits freigeschaltet.",
      "",
      "Nutze `/roles-panel`, um Interessen- und Benachrichtigungsrollen zu wählen.",
    ].join("\n"),
    "Community bereits aktiv",
  );
}

export function buildRolesOverviewEmbed() {
  return rolesEmbed(
    [
      "Hier siehst du die wichtigsten Rollen auf diesem Server.",
      "",
      "**Team**",
      "👑 Founder - Serverleitung und finale Entscheidungen.",
      "🛠️ Developer - Entwicklung, Technik und KlarBot-Systeme.",
      "🤝 Moderator - Community-Schutz, Support und Ordnung.",
      "",
      "**Community und Kunden**",
      "💎 Pro Kunde - Zugriff auf Pro-Bereiche und Kundeninformationen.",
      "🧪 Beta Tester - frühe Tests, Feedback und Beta-Bereiche.",
      "👤 Community - Zugriff auf Community, Support und KlarApps-Bereiche.",
      "",
      "Self-Roles findest du über `/roles-panel`.",
    ].join("\n"),
    "🎭 Rollen",
  );
}

export function buildWelcomeErrorEmbed(message: string) {
  return errorEmbed(message, "Onboarding fehlgeschlagen");
}
