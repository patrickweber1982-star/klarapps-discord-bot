# KlarApps Discord Bot

KlarBot ist der Discord-Bot fuer KlarApps. Phase 2 stellt ein stabiles Core-System bereit: modulare Commands, Events, Interaction Routing, Config, Logging, Error Handling, Permissions, Embed Design, Presence und UI-Component-Helfer.

Es gibt weiterhin keine Logik fuer echte Kundendaten, Zahlungen, Datenbanken oder KlarApps-Website/API-Anbindungen.

## Installation

Abhaengigkeiten installieren oder aktualisieren:

```bash
npm install
```

## .env

Lokale Env-Datei aus dem Beispiel anlegen:

```bash
cp .env.example .env
```

Benötigte Variablen:

```txt
DISCORD_BOT_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_GUILD_ID=
KLARBOT_DASHBOARD_SYNC_ENABLED=false
KLARAPPS_API_BASE_URL=
KLARAPPS_BOT_API_SECRET=
KLARBOT_SYNC_TIMEOUT_MS=5000
KLARBOT_INTERNAL_API_ENABLED=true
KLARBOT_INTERNAL_API_HOST=127.0.0.1
KLARBOT_INTERNAL_API_PORT=4107
```

- `DISCORD_BOT_TOKEN`: Bot-Token aus dem Discord Developer Portal.
- `DISCORD_CLIENT_ID`: Application/Client-ID der Discord-App.
- `DISCORD_GUILD_ID`: Optional. Server-ID eines Discord-Testservers, auf dem Commands zusaetzlich zur globalen Registrierung direkt registriert werden.
- `KLARBOT_DASHBOARD_SYNC_ENABLED`: Optionaler Schalter fuer die spaetere Read-Only Dashboard-Sync-Foundation.
- `KLARAPPS_API_BASE_URL`: Basis-URL der KlarApps Website, z. B. `https://deine-domain.de`.
- `KLARAPPS_BOT_API_SECRET`: Server-to-server Secret fuer die interne KlarBot Website-API. Niemals oeffentlich machen.
- `KLARBOT_SYNC_TIMEOUT_MS`: Timeout fuer spaetere Config-Reads vom Dashboard.
- `KLARBOT_INTERNAL_API_ENABLED`: Schalter fuer die lokale interne KlarBot API. Ohne gesetzten Wert startet sie automatisch, sobald `KLARAPPS_BOT_API_SECRET` vorhanden ist. Mit `false` bleibt sie bewusst deaktiviert.
- `KLARBOT_INTERNAL_API_HOST`: Host fuer die interne KlarBot API. Standard ist `127.0.0.1`, damit die API nur lokal auf dem Server erreichbar ist.
- `KLARBOT_INTERNAL_API_PORT`: Lokaler Port fuer die interne KlarBot API. Standard ist `4107`.

`.env` bleibt ignoriert und darf nicht committed werden.

## Command-Registrierung

Slash Commands werden global fuer alle installierten Server registriert. Wenn `DISCORD_GUILD_ID` gesetzt ist, werden sie zusaetzlich fuer diesen Testserver registriert:

```bash
npm run register
```

Aktuell werden diese Commands registriert:

```txt
/klarbot -> KlarBot ist online. KlarApps Systeme bereit.
/setup -> Erstellt die KlarApps Discord-Grundstruktur oder Creator Templates per CSV.
/help -> Zeigt die KlarBot Hilfe und verfuegbaren Funktionen.
/verify -> Erstellt ein Verify-Panel fuer neue Mitglieder.
/tickets -> Erstellt ein Ticket-Panel fuer Support, Bugs und Feature-Wuensche.
/creator-panel -> Erstellt ein Creator-Panel fuer Streams, Videos, Giveaways und Updates.
/roles -> Erstellt ein Rollen-Panel fuer Community-, Interessen- und Update-Rollen.
/roles-panel -> Erstellt das Self-Role-Panel V1.
/faq -> Sendet eine KlarBot FAQ-Antwort.
/giveaway -> Erstellt ein einfaches Giveaway.
/clear -> Loescht Nachrichten.
/timeout -> Setzt einen Nutzer in Timeout.
/kick -> Kickt einen Nutzer.
/reset-server -> Entfernt bekannte KlarBot Rollen, Channels und Kategorien.
```

## Entwicklung

```bash
npm run dev
```

## Build und Start

```bash
npm run build
npm run start
```

## Projektstruktur

```txt
src/
  index.ts                 Bot-Startpunkt
  register-commands.ts     Discord Slash Command Registrierung
  commands/                Slash Commands und Command Registry
  events/                  Discord Event Handler
  interactions/            Zentrales Interaction Routing
  config/                  ENV-Validierung und Bot-Config
  utils/                   Logger, Errors, Permissions, Embeds, UI Components
  types/                   Gemeinsame TypeScript-Typen
```

## Phase 2 Core System

- Modularer Command Handler mit zentraler Command-Map.
- Event Handler fuer `ready` und `interactionCreate`, vorbereitet fuer weitere Events wie `guildMemberAdd`.
- Logger mit `info`, `success`, `moderation`, `creator`, `roles`, `giveaway`, `welcome`, `template`, `ticketLog`, `transcript`, `faq`, `warn`, `error` und `debug`.
- Config-System mit Validierung fuer `DISCORD_BOT_TOKEN` und `DISCORD_CLIENT_ID`; `DISCORD_GUILD_ID` ist nur noch optional fuer einen Testserver.
- Globales Error Handling fuer `unhandledRejection` und `uncaughtException`.
- Interaction-Fehler werden sauber als KlarBot-Embed beantwortet, damit keine Discord-Fehlermeldung stehen bleibt.
- Permission-Helfer fuer Admin, Server-Owner, Teamrollen, Moderation und `ManageGuild`.
- KlarApps/KlarBot Embed-Helfer fuer `info`, `success`, `warning`, `error`, `moderation`, `punishment` und `onboarding`.
- Creator-Embed-Helfer fuer `creator`, `livestream`, `video` und `giveaway`.
- Giveaway-Embed-Helfer fuer `giveaway` und `giveawayWinner`.
- Rollen-Embed-Helfer fuer `roles` und `community`.
- Bot Presence wird im `ready` Event gesetzt und rotiert zwischen KlarApps-Systemstatus, Hilfe und Community-Hinweisen.
- UI-Component-Helfer fuer Buttons, Dropdowns und Modals.
- Interaction Router fuer Slash Commands, Buttons, Dropdowns und Modals inklusive freundlicher Antworten auf unbekannte Interactions.

## Logger, Errors und Presence

Terminal-Logs folgen einem einheitlichen Format:

```txt
[KlarBot] [SUCCESS] Ticket erstellt
[KlarBot] [MODERATION] Nachrichten gelöscht
[KlarBot] [CREATOR] Stream-Ankündigung erstellt
[KlarBot] [ROLES] Rolle vergeben
[KlarBot] [GIVEAWAY] Gewinner gezogen
[KlarBot] [WELCOME] user joined
[KlarBot] [TEMPLATE] created channel
[KlarBot] [TICKET_LOG] ticket created
[KlarBot] [TRANSCRIPT] transcript created
[KlarBot] [FAQ] faq embed sent
[KlarBot] [RESET] reset completed
[KlarBot] [PLAN] feature allowed
[KlarBot] [ERROR] Permission fehlgeschlagen
```

Farben werden in der Console genutzt, sofern sie nicht ueber `NO_COLOR=true` deaktiviert sind. Debug-Logs erscheinen nur mit `DEBUG=true`.

Der Command-Router fuehrt Slash Commands zentral mit Fehlerbehandlung aus. Button-, Dropdown- und Modal-Interactions werden ebenfalls zentral verarbeitet. Unbekannte oder veraltete Interactions antworten freundlich und werden im Terminal geloggt.

Beim Start zeigt KlarBot im Terminal:

- Botname
- aktive Commands
- Anzahl verbundener Server
- erfolgreichen Start

Die Presence startet mit `KlarApps Systeme aktiv` und rotiert danach zwischen weiteren kurzen Statusmeldungen.

## Free / BASIC / PRO Vorbereitung

KlarBot hat eine lokale Plan-Architektur, aber noch kein echtes Lizenzsystem. Aktuell ist `DEFAULT_PLAN` auf `basic` gesetzt, damit alle bestehenden BASIC-Funktionen weiterhin funktionieren.

Plan-Struktur:

- `free`: Setup, Verify, Welcome, Voice, FAQ und Help.
- `basic`: alle FREE-Funktionen plus Tickets, Ticket-Logs, Transcripts, Giveaways, Rollenpanel, Auto-Roles, Creator Templates, Moderation und Server Reset.
- `pro`: Platzhalter fuer spaetere Features wie Advanced Automations, App Sync, Analytics, AI Tools und Cloud Backup.

Feature-Guard:

- `canUseFeature(plan, feature)` prueft lokal, ob ein Feature fuer einen Plan erlaubt ist.
- Unbekannte Features und unbekannte Plaene geben `false` zurueck und werden mit `[KlarBot] [PLAN]` geloggt.
- Vorbereitet sind Guard-Checks fuer `/tickets`, `/giveaway`, `/roles-panel`, `/reset-server` und Creator Templates in `/setup`.

Dateien:

- `src/features/plans/planTypes.ts`
- `src/features/plans/featureFlags.ts`
- `src/features/plans/planConfig.ts`
- `src/features/plans/featureGuard.ts`
- `src/features/plans/planLogger.ts`

Noch nicht enthalten: Lizenzpruefung, Datenbank, Dashboard, Stripe, Discord OAuth, Serverbindung oder echte Planverwaltung.

## Permissions

Permissions sind zentral in `src/utils/permissions.ts` gebuendelt. Vorbereitet sind:

- Admin Check
- Manage-Guild Check
- Server-Owner Check
- Teamrollen Check
- Moderationsrechte
- klare Meldungen bei fehlenden Bot-Rechten

Die Struktur ist bewusst einfach gehalten, damit spaeter Lizenzsysteme, Feature Flags oder Kundenrollen darauf aufbauen koennen.

## Setup Command und Onboarding

`/setup` erstellt die KlarApps Discordstruktur ohne Duplikate und richtet den Onboarding-Flow ein. Bestehende Rollen, Kategorien, Channels und Setup-Nachrichten werden anhand ihrer Namen, Buttons oder Marker erkannt und wiederverwendet. Kategorien und Channels werden in einer festen KlarApps-Reihenfolge sortiert.

Erstellt werden:

- `📢 INFO` mit Regeln, KlarBot-Erklaerung, Willkommen, Ankuendigungen, Roadmap und Rollenuebersicht.
- `💬 COMMUNITY` mit Allgemein, Ideen/Feedback, Showcase und Community-Hilfe.
- `🛠️ SUPPORT` mit Support, Bug Reports, Feature-Wuenschen und Ticket-Logs.
- `🤖 KLARAPPS` mit Produktbereichen.
- `🔒 KUNDENBEREICH` mit Downloads, Pro Features und Beta Tests.
- `🔊 VOICE` mit Allgemein, Support Talk und Community Talk.
- `👮 MODERATION` mit Mod-Logs fuer Teamrollen.
- Rollen fuer Founder, Developer, Moderator, Pro Kunde, Beta Tester, Regeln akzeptiert und Community.

Nur Administratoren koennen `/setup` ausfuehren.

Onboarding-Flow:

1. Neue Nutzer ohne Rolle sehen nur `📜・regeln`.
2. Dort bestaetigen sie `✅ Regeln akzeptieren` und erhalten `📘 Regeln akzeptiert`.
3. Danach sehen sie `🤖・so-funktioniert-klarbot`.
4. Dort klicken sie `🚀 Community freischalten` und erhalten `👤 Community`.
5. Danach sehen sie die normalen Community-, Support- und KlarApps-Bereiche.

Welcome Polish V1:

- neue Join-Welcome-Embeds mit User Mention und Servername.
- kompakte Schritte fuer Regeln, Verify, Community, Rollen und Support.
- Progress-Hinweise ohne Datenbank.
- Verify- und Onboarding-Buttons antworten mit modernen Embeds.
- Nach Freischaltung wird auf `/roles-panel` und Interessenrollen hingewiesen.
- Logs laufen ueber `[KlarBot] [WELCOME]`.

Der Join-Welcome nutzt das Discord `GuildMembers` Intent. Das Intent ist im Bot-Code immer aktiv und muss im Discord Developer Portal ebenfalls aktiviert sein, damit `guildMemberAdd` ausgeloest wird.

Permissions:

- `@everyone` sieht am Anfang nur `📜・regeln`.
- `🤖・so-funktioniert-klarbot` ist nur fuer `📘 Regeln akzeptiert` und Teamrollen sichtbar.
- Community-Bereiche sind fuer `👤 Community` und Teamrollen sichtbar.
- Kundenbereiche sind fuer `💎 Pro Kunde`, `🧪 Beta Tester` und Teamrollen sichtbar.
- Voice-Bereiche sind fuer `👤 Community` und Teamrollen sichtbar und betretbar.
- Moderationsbereiche sind nur fuer Teamrollen sichtbar.
- `📋・ticket-logs` ist fuer Founder, Developer, Moderator und optional vorhandene Supporter sichtbar, aber nicht fuer normale Community-Mitglieder.
- Info-Channels sind fuer Community lesbar, aber nur Teamrollen duerfen schreiben.
- Teamrollen sind `👑 Founder`, `🛠️ Developer` und `🤝 Moderator`.

Automatische Setup-Nachrichten:

- Regel-Embed mit Button in `📜・regeln`.
- KlarBot-Erklaerung mit Button in `🤖・so-funktioniert-klarbot`.
- Willkommens-Embed in `👋・willkommen`.
- Rollenuebersicht in `🎭・rollen`.

Der Bot braucht fuer `/setup` insbesondere Rechte zum Verwalten von Rollen, Channels und Nachrichten sowie zum Lesen der Nachrichtenhistorie fuer den Duplicate-Schutz.

Stabilisierung V1:

- `/setup` und `/setup templates:...` pruefen vor dem Start, ob KlarBot Rollen und Channels verwalten sowie Nachrichten senden und lesen kann.
- Wenn Setup-Nachrichten wegen fehlender Nachrichtenhistorie nicht sicher auf Duplikate geprueft werden koennen, postet KlarBot keine weitere Kopie und loggt eine Warnung.
- Fehler waehrend Setup oder Creator Template Setup werden als klares Embed beantwortet, statt nur im globalen Error Handler zu landen.
- Wiederholtes `/setup` bleibt idempotent: bestehende Rollen, Kategorien, Channels und Setup-Nachrichten werden wiederverwendet.

Sichtbare Hauptrollen:

- `👑 Founder`
- `🛠️ Developer`
- `🤝 Moderator`
- `💎 Pro Kunde`
- `🧪 Beta Tester`
- optional sichtbare Creator-Rollen wie `🎬 Creator` und `⭐ Stammzuschauer`

KlarBot setzt fuer diese Rollen `hoist: true`, damit sie separat in der Discord-Mitgliederliste erscheinen. Bestehende Rollen werden beim Setup farblich und fuer die Mitgliederlisten-Anzeige aktualisiert, sofern die Bot-Rolle hoch genug steht. Gefaehrliche Admin-Rechte werden dabei nicht automatisch vergeben.

Die Rollenuebersicht in `🎭・rollen` zeigt die wichtigsten Serverrollen und erklaert kurz Founder, Developer, Moderator, Pro Kunde, Beta Tester und Community. Rollenbuttons werden dort noch nicht automatisch gepostet; dafuer steht separat `/roles` bereit.

## Creator Setup Builder V1

`/setup` kann optional statische Creator-/Community-Templates erstellen:

```txt
/setup templates:twitch
/setup templates:youtube
/setup templates:twitch,youtube
/setup templates:twitch,youtube,indiedev
/setup templates:support
```

Unterstuetzte Templates:

- `twitch` fuer Twitch Creator
- `youtube` fuer YouTube Creator
- `indiedev` fuer Indie-Dev-Communities
- `support` fuer Support-Server

Mehrere Templates werden zusammengefuehrt. Kategorien, Channels und Rollen werden nach Namen dedupliziert. Wenn z. B. `💬・allgemein`, `🎫・support` oder `⭐ Stammzuschauer` in mehreren Templates vorkommen, erstellt KlarBot sie nur einmal.

Duplicate Protection:

- bestehende Kategorien werden uebersprungen
- bestehende Channels werden uebersprungen
- bestehende Rollen werden uebersprungen
- alle Schritte werden mit `[KlarBot] [TEMPLATE]` geloggt

Nach dem Template-Setup zeigt KlarBot ein Summary-Embed mit gewaehlten Templates, erstellten Elementen und uebersprungenen Elementen. Als naechste Schritte werden `/roles-panel`, Giveaway, Verify und Tickets empfohlen.

Sicherheit:

- Template-Setup darf nur von Administratoren, `👑 Founder` oder `🛠️ Developer` genutzt werden.
- Template-Rollen bekommen keine Admin- oder gefaehrlichen Permissions.
- Es gibt keine Datenbank, kein Dashboard, keinen Wizard und keine dynamischen Custom Templates.

## Help Command

`/help` zeigt ein KlarApps/KlarBot Embed mit den verfuegbaren Commands und dient als erstes zentrales Bot-Menue.

Unter dem Help-Embed stehen vier Buttons:

- `Übersicht`: kurze Erklaerung zu KlarBot.
- `Setup`: erklaert den `/setup` Command.
- `Support`: erklaert den aktuellen Ticket-Einstieg.
- `Rollen`: erklaert Verify und die spaeter vorbereiteten Rollenbereiche.

## FAQ-System V1

`/faq topic:<thema>` sendet ein modernes KlarBot FAQ-Embed in den aktuellen Channel. Der Command darf nur von Administratoren sowie `ðŸ‘‘ Founder` und `ðŸ› ï¸ Developer` genutzt werden.

Verfuegbare FAQ-Themen:

- `verify` erklaert Regeln akzeptieren, Community freischalten und Rollen erhalten.
- `tickets` erklaert Support, Ticket-Erstellung und wann Tickets sinnvoll sind.
- `giveaway` erklaert Teilnahme, Gewinnerauswahl und Giveaway-Rollen.
- `roles` erklaert Rollenbuttons, Ping-Rollen und Interessenrollen.
- `creator` erklaert Creator Templates, Twitch/YouTube Setup und Community-Funktionen.

Aliases wie `setup`, `support`, `ticket`, `rollen` und `templates` werden auf passende Themen gemappt. Unbekannte Themen werden freundlich ephemeral beantwortet und im Terminal mit `[KlarBot] [FAQ]` geloggt.

Dateien:

- `src/features/faq/faqConfig.ts`
- `src/features/faq/faqEmbeds.ts`
- `src/features/faq/faqCommand.ts`
- `src/features/faq/faqLogger.ts`
- `src/features/faq/types.ts`

Das FAQ-System ist statisch und config-basiert. Es nutzt keine Datenbank, kein Dashboard, keine Suche und keine AI.

## Verify Command

`/verify` erstellt ein modernes Verify-Panel fuer neue Mitglieder. Der Command darf nur von Administratoren oder Nutzern mit `Manage Guild` genutzt werden. Der neue Onboarding-Flow ueber `/setup` ist der empfohlene Weg; `/verify` bleibt als einfacher Community-Freischaltcommand verfuegbar.

Das Panel kann in diesen Channels erstellt werden:

- `👋・willkommen`
- `📜・regeln`

Nutzer klicken auf `✅ Verifizieren` und erhalten die Rolle `👤 Community`. Wenn die Rolle noch nicht existiert, erstellt KlarBot sie automatisch. Bereits verifizierte Nutzer erhalten keine doppelte Rolle und bekommen eine freundliche Rueckmeldung.

Die Rollenlogik ist modular vorbereitet, damit spaeter Pro-, Beta-, Kunden- und Lizenzrollen sauber ergaenzt werden koennen.

Dateien fuer Welcome/Verify Polish:

- `src/features/welcome/welcomeEmbeds.ts`
- `src/features/welcome/onboardingFlow.ts`
- `src/features/welcome/verifyFlow.ts`
- `src/features/welcome/welcomeLogger.ts`
- `src/events/guildMemberAdd.ts`

## Ticket-System V1

`/tickets` erstellt ein KlarBot Support-Panel. Der Command darf nur von Administratoren oder Nutzern mit `Manage Guild` genutzt werden.

Das Panel bietet drei Tickettypen:

- `🛠️ Support`
- `🐞 Bug Report`
- `💡 Feature-Wunsch`

Beim Klick erstellt KlarBot einen privaten Channel in der Kategorie `🛠️ SUPPORT`. Wenn die Kategorie fehlt, wird sie automatisch erstellt und nach Moeglichkeit einsortiert.

Channel-Namen richten sich nach dem Tickettyp:

- `support-username`
- `bug-username`
- `feature-username`

Ticket-Channel sind sichtbar fuer:

- den Ticket-Ersteller
- `👑 Founder`
- `🛠️ Developer`
- `🤝 Moderator`

Normale Community-Mitglieder sehen fremde Tickets nicht. Ein Nutzer kann nicht mehrere offene Tickets des gleichen Typs gleichzeitig erstellen. Tickets koennen ueber `🔒 Ticket schließen` geschlossen werden; KlarBot wartet 5 Sekunden und loescht danach den Channel.

Ticket-Nachrichten enthalten Tickettyp, Nutzer, kurze Hinweise und eine Erinnerung an respektvollen Umgang. Der Button `📌 Claim` ist vorbereitet und antwortet aktuell mit `Feature folgt bald.`.

Ticket Logs V1:

- `/setup` erstellt `📋・ticket-logs` unter `🛠️ SUPPORT`.
- Ticket-Erstellung wird als Log-Embed gepostet.
- Ticket-Schließung wird als Log-Embed gepostet.
- Ticket-Fehler werden als Warn-Embed gepostet, falls der Log-Channel erreichbar ist.
- Wenn der Log-Channel fehlt oder Bot-Rechte fehlen, crasht KlarBot nicht und loggt eine Warnung im Terminal.
- Es werden nur Metadaten geloggt: User, Channel, Zeit, Guild, Aktion und Tickettyp bzw. Grund.
- Es gibt keine Ticket-History und keine Datenbank.

Transcript Export V1:

- Beim Schliessen eines Tickets erstellt KlarBot automatisch ein Markdown-Transcript.
- Das Transcript wird als Datei in `ðŸ“‹ãƒ»ticket-logs` gepostet.
- Der Export enthaelt Ticketname, Guild, Ersteller, schliessende Person, Exportzeit, Channelname und den Nachrichtenverlauf.
- Nachrichten werden chronologisch als `[HH:MM] Username:` formatiert.
- Attachments werden nur als Links gespeichert; Dateien werden nicht heruntergeladen.
- Systemnachrichten werden ignoriert.
- Falls der Log-Channel fehlt oder Upload-Rechte fehlen, wird sauber im Terminal geloggt und das Ticket trotzdem geschlossen.
- V1 exportiert die letzten 100 Nachrichten, damit keine API-Spam-Loesung entsteht.
- Es gibt keinen HTML-Export, keine Webansicht, kein Cloud Storage und keine Datenbank.

Ticket-Log-Dateien:

- `src/features/tickets/ticketLogService.ts`
- `src/features/tickets/ticketLogEmbeds.ts`
- `src/features/tickets/ticketLogger.ts`

Transcript-Dateien:

- `src/features/tickets/transcripts/transcriptBuilder.ts`
- `src/features/tickets/transcripts/transcriptFormatter.ts`
- `src/features/tickets/transcripts/transcriptLogger.ts`
- `src/features/tickets/transcripts/transcriptUploader.ts`

Das Ticket-System V1 nutzt keine Datenbank, kein Webpanel, keine AI und keine Analytics.

## Moderation BASIC

KlarBot enthaelt erste stabile Moderationscommands:

- `/clear amount:1-100` loescht Nachrichten im aktuellen Channel und bestaetigt ephemeral, wie viele Nachrichten entfernt wurden.
- `/timeout user minutes reason?` setzt einen Nutzer in Timeout.
- `/kick user reason?` kickt einen Nutzer vom Server.

Moderationscommands duerfen genutzt werden von:

- `👑 Founder`
- `🛠️ Developer`
- `🤝 Moderator`
- Administratoren

KlarBot prueft bei `/clear`, ob die Zahl gueltig ist, ob der Channel Nachrichten loeschen kann und ob der Bot die Berechtigung `Nachrichten verwalten` besitzt. Nachrichten, die Discord wegen des 14-Tage-Limits nicht loeschen kann, werden sauber behandelt.

KlarBot prueft bei `/timeout` und `/kick`, ob der Server-Owner betroffen ist, ob die Rollen-Hierarchie passt, ob der Bot die Aktion ausfuehren darf und ob bereits ein Timeout aktiv ist. Antworten nutzen mobilefreundliche Moderations-Embeds mit Nutzer, Moderator, Dauer und Grund.

Mod-Logs: `/setup` legt optional `👮 MODERATION` und `📋・mod-logs` ohne Duplikate an. Wenn der Channel vorhanden ist, schreibt KlarBot Moderationsaktionen dort als Embed. Wenn der Channel fehlt, wird nur im Terminal mit `[KlarBot] [MODERATION]` geloggt.

Ticket-Kompatibilitaet: Founder, Developer und Moderator sehen private Tickets weiterhin und koennen sie moderieren.

## Server Reset V1

`/reset-server` entfernt bekannte KlarBot-Elemente aus dem Server. Der Command darf nur von Administratoren sowie `👑 Founder` und `🛠️ Developer` genutzt werden.

Sicherheitsmodus:

- Ohne `confirm:true` wird nichts geloescht.
- Geloescht werden nur Namen aus den KlarBot-Whitelists.
- Offene Ticket-Channels werden nur geloescht, wenn ihr Topic den KlarBot-Ticket-Praefix nutzt.
- `@everyone`, verwaltete Rollen, Systemrollen und unbekannte/fremde Elemente werden nicht geloescht.
- Der Channel, in dem der Reset ausgefuehrt wird, wird uebersprungen, damit KlarBot den Abschluss sicher melden kann.

Delete-Reihenfolge:

1. Text- und Ticket-Channels
2. Voice-Channels
3. Kategorien
4. Rollen

Logs laufen ueber `[KlarBot] [RESET]` und enthalten Start, geloeschte Channels, Kategorien, Rollen, uebersprungene Elemente und Abschluss. Der Reset nutzt keine Datenbank, kein Backup, kein Restore-System und kein Dashboard.

Dateien:

- `src/features/reset/resetCommand.ts`
- `src/features/reset/resetService.ts`
- `src/features/reset/resetLogger.ts`
- `src/features/reset/resetConfig.ts`

## Creator BASIC

`/creator-panel` erstellt ein Creator-Panel fuer kleine Creator, Streamer, YouTuber und Community-Server. Der Command darf von Administratoren und KlarApps-Teamrollen genutzt werden.

Das Panel enthaelt vier Buttons:

- `🔴 Stream ankündigen` erstellt ein `LIVE NOW` Embed mit Stream-Hinweis und Platzhalter-Link. Twitch/YouTube-Verbindung folgt später.
- `📹 Neues Video` erstellt ein Video-Embed mit Platzhalter-Link. Twitch/YouTube-Verbindung folgt später.
- `🎁 Giveaway` weist auf `/giveaway` hin. Ein Creator-Backend folgt spaeter.
- `📢 Community Update` erstellt ein kurzes Update-Embed fuer Ankuendigungen.

Creator-Aktionen werden im Terminal mit `[KlarBot] [CREATOR]` geloggt. Es gibt noch keine Twitch-/YouTube-Anbindung, keine Datenbank und keine automatische Link-Verwaltung. Stream- und Video-Links sind aktuell klar als Platzhalter markiert, bis spaeter Modals oder konfigurierte Creator-Profile ergaenzt werden.

## Giveaway BASIC

`/giveaway` erstellt ein einfaches, mobiles Giveaway fuer Creator und Community-Server. Der Command darf von Administratoren und KlarApps-Teamrollen genutzt werden.

Parameter:

- `prize` ist der Preis.
- `duration_minutes` ist die Laufzeit in Minuten.
- `winners` ist optional und standardmaessig `1`.

Beispiel:

```txt
/giveaway prize:"Discord Nitro" duration_minutes:10 winners:1
```

KlarBot postet ein Giveaway-Embed mit Preis, Gewinneranzahl, Endzeit und Veranstalter. Nutzer nehmen ueber `🎉 Teilnehmen` teil. Doppelte Teilnahme wird verhindert und immer ephemeral beantwortet.

Nach Ablauf zieht KlarBot zufaellige Gewinner und postet ein Ergebnis-Embed im Channel. Wenn niemand teilgenommen hat, wird `Keine gültigen Teilnehmer.` angezeigt.

Das System arbeitet bewusst nur in-memory. Nach einem Bot-Neustart sind aktive Giveaways nicht mehr bekannt. Es gibt keine Datenbank, keine API und kein Webpanel.

## Rollenbuttons BASIC

`/roles` erstellt ein mobiles Rollen-Panel fuer Community-, Interessen-, Creator- und Update-Rollen. Der Command darf von Administratoren und KlarApps-Teamrollen genutzt werden.

Das Panel enthaelt diese Rollenbuttons:

- `🎬 Creator`
- `💻 Coding`
- `🎮 Gaming`
- `🧪 Beta Tester`
- `📢 Updates`

Beim Klick vergibt KlarBot die Rolle. Beim erneuten Klick entfernt KlarBot sie wieder. Fehlende Rollen werden automatisch erstellt und anhand des Rollennamens wiederverwendet, damit keine Duplikate entstehen.

Antworten sind ephemeral, damit der Channel sauber bleibt. Rollenaktionen werden im Terminal mit `[KlarBot] [ROLES]` geloggt. Das System nutzt keine Datenbank, keine API und keine Website-Anbindung. Die Utility-Funktionen sind so aufgebaut, dass `/setup` spaeter automatisch ein Rollen-Panel posten kann.

Wenn KlarBot Rollen nicht erstellen oder verwalten kann, antwortet `/roles` mit einer klaren Bot-Rechte-Meldung. Rollenbutton-Klicks fangen fehlende Guild-Member und Rollenfehler ab, damit keine Interaction abstuerzt.

## Self-Role-System V1

`/roles-panel` erstellt ein config-basiertes Self-Role-Panel. Der Command darf nur von Administratoren sowie den Rollen `👑 Founder` und `🛠️ Developer` genutzt werden.

Die Rollen sind fest in `src/features/roles/rolesConfig.ts` definiert. Nur diese Whitelist darf ueber Buttons vergeben oder entfernt werden:

- `role_youtube` -> `🎥 YouTube`
- `role_twitch` -> `🟣 Twitch`
- `role_tiktok` -> `🎵 TikTok`
- `role_gaming` -> `🎮 Gaming`
- `role_dev` -> `💻 Development`
- `role_design` -> `🎨 Design`
- `role_updates` -> `🔔 Updates`
- `role_giveaways` -> `🎉 Giveaways`
- `role_events` -> `📢 Events`

Beim Klick toggelt KlarBot die Rolle: Wenn der Nutzer sie noch nicht hat, wird sie hinzugefuegt. Wenn er sie bereits hat, wird sie entfernt. Antworten sind ephemeral:

- `✅ Rolle hinzugefügt`
- `🗑️ Rolle entfernt`

Fehler wie fehlende Rollen, fehlende Bot-Rechte oder nicht gefundene Guild-Member werden als KlarBot Error-Embed beantwortet. Rollen werden in V1 nicht automatisch erstellt; sie muessen im Server vorhanden sein und die Bot-Rolle muss hoch genug stehen.

Dateien:

- `src/features/roles/rolesPanel.ts`
- `src/features/roles/rolesConfig.ts`
- `src/features/roles/rolesInteraction.ts`
- `src/features/roles/types.ts`

## Geplante Features

- Support-Workflows im Discord-Server.
- Rollenvergabe anhand eines spaeteren Kundenstatus.
- Ticket-Erstellung und Ticket-Verwaltung.
- Verbindung zu KlarApps-Pro-Lizenzen.
- Sichere Anbindung an bestehende KlarApps-Systeme ohne direkte Speicherung sensibler Daten im Bot.

## Phase 8.8 Secure Website API Foundation

KlarBot ist vorbereitet, um spaeter zentrale Serverkonfiguration aus der KlarApps Website zu lesen. Die Anbindung ist bewusst modular, secret-geschuetzt und read-only:

- `src/features/dashboardSync/dashboardSyncClient.ts` liest interne Endpunkte mit `KLARAPPS_BOT_API_SECRET`.
- Vorbereitete Website-Endpunkte: Health, Server-Config, Trial-Status und Modulstatus.
- `src/features/dashboardSync/trialSync.ts` bewertet Trial-Zustaende wie aktiv, laeuft bald ab, abgelaufen, Cooldown aktiv und Removal Pending.
- `src/features/dashboardSync/moduleSync.ts` mappt Dashboard-Module auf lokale Feature-Keys, ohne Live-Aktivierung auszufuehren.
- `src/features/dashboardSync/syncService.ts` erstellt beim Bot-Start nur Snapshots und Logs.

Noch nicht aktiv:

- keine automatischen Modul-Aenderungen
- keine Rollen- oder Channel-Bearbeitung aus Dashboard-Daten
- kein Websocket-/Realtime-Sync
- kein automatisches Verlassen von Servern
- kein Bot-zu-Website Schreibzugriff

Der Bot-Token bleibt ausschliesslich serverseitig. Der Dashboard-Sync nutzt einen separaten Server-to-server Token und darf niemals im Frontend oder in Logs ausgegeben werden.

## Hinweise

- Keine echten Kundendaten oder Zahlungsdaten in den Bot-Code schreiben.
- Secrets nur ueber `.env` oder Server-Environment setzen.
- `.env` darf nicht committed werden.
- Rollen-, Lizenz- und Ticketlogik wird spaeter separat und kontrolliert ergaenzt.
