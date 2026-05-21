# KlarApps Discord Bot

KlarBot ist der Discord-Bot fuer KlarApps. Diese Grundstruktur enthaelt aktuell nur den ersten Slash Command und noch keine Logik fuer echte Kundendaten, Zahlungen, Rollen oder Lizenzen.

## Einrichtung

Abhaengigkeiten installieren:

```bash
npm install
```

Lokale Env-Datei anlegen:

```bash
cp .env.example .env
```

## Environment Variables

```txt
DISCORD_BOT_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_GUILD_ID=
```

- `DISCORD_BOT_TOKEN`: Bot-Token aus dem Discord Developer Portal.
- `DISCORD_CLIENT_ID`: Application/Client-ID der Discord-App.
- `DISCORD_GUILD_ID`: Server-ID des Discord-Testservers, auf dem Commands registriert werden.

## Command-Registrierung

Slash Commands werden fuer den in `DISCORD_GUILD_ID` gesetzten Server registriert:

```bash
npm run register
```

Aktuell wird nur dieser Command registriert:

```txt
/klarbot -> KlarBot ist online. KlarApps Systeme bereit.
```

## Bot starten

```bash
npm run dev
```

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
