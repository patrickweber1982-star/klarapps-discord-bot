# KlarApps Discord Bot

Erste Grundstruktur fuer den KlarApps Discord-Bot. Der Bot enthaelt aktuell nur einen Test-Command und keine Logik fuer echte Kundendaten, Zahlungen, Rollen oder Lizenzen.

## Start

1. Abhaengigkeiten installieren:

```bash
cd discord-bot
npm install
```

2. Lokale Env-Datei anlegen:

```bash
cp .env.example .env
```

3. Discord Slash-Commands fuer den Test-Server registrieren:

```bash
npm run register:commands
```

4. Bot starten:

```bash
npm run dev
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

## Aktueller Test-Command

```txt
/ping -> KlarApps Bot online
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
- Rollen-, Lizenz- und Ticketlogik wird spaeter separat und kontrolliert ergaenzt.
