# KlarApps Discord Bot

KlarBot ist der Discord-Bot fuer KlarApps. Phase 2 stellt ein stabiles Core-System bereit: modulare Commands, Events, Interaction Routing, Config, Logging, Error Handling, Permissions, Embed Design, Bot Status und UI-Component-Helfer.

Es gibt weiterhin keine Logik fuer echte Kundendaten, Zahlungen, Rollen, Tickets, Datenbanken oder KlarApps-Website/API-Anbindungen.

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
- Logger mit `info`, `warn`, `error` und `debug`.
- Config-System mit Validierung fuer `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID` und `DISCORD_GUILD_ID`.
- Globales Error Handling fuer `unhandledRejection` und `uncaughtException`.
- Interaction-Fehler werden sauber beantwortet.
- Permission-Helfer fuer Admin, Server-Owner und `ManageGuild`.
- KlarApps/KlarBot Embed-Helfer fuer Success, Error und Info.
- Bot Status wird im `ready` Event auf `KlarApps Systeme` gesetzt.
- UI-Component-Helfer fuer Buttons, Dropdowns und Modals.
- Interaction Router fuer Slash Commands, Buttons, Dropdowns und Modals.

## Setup Command

`/setup` erstellt eine einfache KlarApps Discordstruktur ohne Duplikate. Bestehende Rollen, Kategorien und Channels werden anhand ihrer Namen erkannt und wiederverwendet.

Erstellt werden:

- Kategorien fuer Start, Community, Support und KlarApps.
- Textchannels fuer Willkommen, Ankuendigungen, Regeln, Community, Support, Bug Reports und Produktbereiche.
- Rollen fuer Founder, Developer, Moderator, Pro und Community.

Nur Administratoren koennen `/setup` ausfuehren. Start- und Info-Channels werden fuer die Community-Rolle lesbar, aber nicht beschreibbar angelegt. Community-, Support- und KlarApps-Bereiche sind fuer die Community-Rolle normal schreibbar.

## Help Command

`/help` zeigt ein KlarApps/KlarBot Embed mit den verfuegbaren Commands und dient als erstes zentrales Bot-Menue.

Unter dem Help-Embed stehen vier Buttons:

- `Übersicht`: kurze Erklaerung zu KlarBot.
- `Setup`: erklaert den `/setup` Command.
- `Support`: weist darauf hin, dass ein Ticket-System spaeter folgt.
- `Rollen`: erklaert Verify und die spaeter vorbereiteten Rollenbereiche.

## Verify Command

`/verify` erstellt ein modernes Verify-Panel fuer neue Mitglieder. Der Command darf nur von Administratoren oder Nutzern mit `Manage Guild` genutzt werden.

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

Beim Klick erstellt KlarBot einen privaten Channel `ticket-username` in der Kategorie `🛠️ SUPPORT`. Wenn die Kategorie fehlt, wird sie automatisch erstellt.

Ticket-Channel sind sichtbar fuer:

- den Ticket-Ersteller
- `👑 Founder`
- `🛠️ Developer`
- `🤝 Moderator`

Normale Community-Mitglieder sehen fremde Tickets nicht. Ein Nutzer kann nicht mehrere offene Tickets des gleichen Typs gleichzeitig erstellen. Tickets koennen ueber `🔒 Ticket schließen` geschlossen werden; KlarBot wartet 5 Sekunden und loescht danach den Channel.

Das Ticket-System V1 nutzt keine Datenbank, kein Webpanel, keine AI und keine Analytics.

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
