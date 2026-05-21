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
```

- `DISCORD_BOT_TOKEN`: Bot-Token aus dem Discord Developer Portal.
- `DISCORD_CLIENT_ID`: Application/Client-ID der Discord-App.
- `DISCORD_GUILD_ID`: Server-ID des Discord-Testservers, auf dem Commands registriert werden.

`.env` bleibt ignoriert und darf nicht committed werden.

## Command-Registrierung

Slash Commands werden fuer den in `DISCORD_GUILD_ID` gesetzten Server registriert:

```bash
npm run register
```

Aktuell werden diese Commands registriert:

```txt
/klarbot -> KlarBot ist online. KlarApps Systeme bereit.
/setup -> Erstellt die KlarApps Discord-Grundstruktur. Nur fuer Administratoren.
/help -> Zeigt die KlarBot Hilfe und verfuegbaren Funktionen.
/verify -> Erstellt ein Verify-Panel fuer neue Mitglieder.
/tickets -> Erstellt ein Ticket-Panel fuer Support, Bugs und Feature-Wuensche.
/creator-panel -> Erstellt ein Creator-Panel fuer Streams, Videos, Giveaways und Updates.
/roles -> Erstellt ein Rollen-Panel fuer Community-, Interessen- und Update-Rollen.
/giveaway -> Erstellt ein einfaches Giveaway.
/clear -> Loescht Nachrichten.
/timeout -> Setzt einen Nutzer in Timeout.
/kick -> Kickt einen Nutzer.
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
- Logger mit `info`, `success`, `moderation`, `creator`, `roles`, `giveaway`, `warn`, `error` und `debug`.
- Config-System mit Validierung fuer `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID` und `DISCORD_GUILD_ID`.
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
- `🛠️ SUPPORT` mit Support, Bug Reports und Feature-Wuenschen.
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

Permissions:

- `@everyone` sieht am Anfang nur `📜・regeln`.
- `🤖・so-funktioniert-klarbot` ist nur fuer `📘 Regeln akzeptiert` und Teamrollen sichtbar.
- Community-Bereiche sind fuer `👤 Community` und Teamrollen sichtbar.
- Kundenbereiche sind fuer `💎 Pro Kunde`, `🧪 Beta Tester` und Teamrollen sichtbar.
- Voice-Bereiche sind fuer `👤 Community` und Teamrollen sichtbar und betretbar.
- Moderationsbereiche sind nur fuer Teamrollen sichtbar.
- Info-Channels sind fuer Community lesbar, aber nur Teamrollen duerfen schreiben.
- Teamrollen sind `👑 Founder`, `🛠️ Developer` und `🤝 Moderator`.

Automatische Setup-Nachrichten:

- Regel-Embed mit Button in `📜・regeln`.
- KlarBot-Erklaerung mit Button in `🤖・so-funktioniert-klarbot`.
- Willkommens-Embed in `👋・willkommen`.
- Rollenuebersicht in `🎭・rollen`.

Der Bot braucht fuer `/setup` insbesondere Rechte zum Verwalten von Rollen, Channels und Nachrichten sowie zum Lesen der Nachrichtenhistorie fuer den Duplicate-Schutz.

Die Rollenuebersicht in `🎭・rollen` zeigt die wichtigsten Serverrollen und erklaert kurz Founder, Developer, Moderator, Pro Kunde, Beta Tester und Community. Rollenbuttons werden dort noch nicht automatisch gepostet; dafuer steht separat `/roles` bereit.

## Help Command

`/help` zeigt ein KlarApps/KlarBot Embed mit den verfuegbaren Commands und dient als erstes zentrales Bot-Menue.

Unter dem Help-Embed stehen vier Buttons:

- `Übersicht`: kurze Erklaerung zu KlarBot.
- `Setup`: erklaert den `/setup` Command.
- `Support`: erklaert den aktuellen Ticket-Einstieg.
- `Rollen`: erklaert Verify und die spaeter vorbereiteten Rollenbereiche.

## Verify Command

`/verify` erstellt ein modernes Verify-Panel fuer neue Mitglieder. Der Command darf nur von Administratoren oder Nutzern mit `Manage Guild` genutzt werden. Der neue Onboarding-Flow ueber `/setup` ist der empfohlene Weg; `/verify` bleibt als einfacher Community-Freischaltcommand verfuegbar.

Das Panel kann in diesen Channels erstellt werden:

- `👋・willkommen`
- `📜・regeln`

Nutzer klicken auf `✅ Verifizieren` und erhalten die Rolle `👤 Community`. Wenn die Rolle noch nicht existiert, erstellt KlarBot sie automatisch. Bereits verifizierte Nutzer erhalten keine doppelte Rolle und bekommen eine freundliche Rueckmeldung.

Die Rollenlogik ist modular vorbereitet, damit spaeter Pro-, Beta-, Kunden- und Lizenzrollen sauber ergaenzt werden koennen.

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

## Geplante Features

- Support-Workflows im Discord-Server.
- Rollenvergabe anhand eines spaeteren Kundenstatus.
- Ticket-Erstellung und Ticket-Verwaltung.
- Verbindung zu KlarApps-Pro-Lizenzen.
- Sichere Anbindung an bestehende KlarApps-Systeme ohne direkte Speicherung sensibler Daten im Bot.

## Hinweise

- Keine echten Kundendaten oder Zahlungsdaten in den Bot-Code schreiben.
- Secrets nur ueber `.env` oder Server-Environment setzen.
- `.env` darf nicht committed werden.
- Rollen-, Lizenz- und Ticketlogik wird spaeter separat und kontrolliert ergaenzt.
