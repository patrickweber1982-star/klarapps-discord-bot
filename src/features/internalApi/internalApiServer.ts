import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { Client } from "discord.js";

import type { BotConfig } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import { sendVerifyPanelForGuild } from "../verify/verifyPanelSync.js";

function sendJson(
  response: ServerResponse,
  status: number,
  payload: Record<string, unknown>,
) {
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function readBearerToken(request: IncomingMessage) {
  const header = request.headers.authorization ?? "";
  const [scheme, token] = header.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token.trim();
}

function readJsonBody(request: IncomingMessage) {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;

      if (body.length > 16_384) {
        reject(new Error("Payload zu gross."));
        request.destroy();
      }
    });

    request.on("end", () => {
      if (!body.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body) as Record<string, unknown>);
      } catch {
        reject(new Error("Ungueltiges JSON."));
      }
    });

    request.on("error", reject);
  });
}

function authorize(request: IncomingMessage, config: BotConfig) {
  const expected = config.internalApi.secret;

  if (!expected) {
    return false;
  }

  return readBearerToken(request) === expected;
}

export function startInternalApiServer(client: Client, config: BotConfig) {
  if (!config.internalApi.enabled) {
    logger.info("KlarBot interne API ist deaktiviert.");
    return null;
  }

  if (!config.internalApi.secret) {
    logger.warn(
      "KlarBot interne API wurde angefordert, aber kein Secret ist konfiguriert.",
    );
    return null;
  }

  const server = createServer(async (request, response) => {
    if (!authorize(request, config)) {
      sendJson(response, 401, {
        ok: false,
        reason: "unauthorized",
        message: "Internal API Secret fehlt oder ist ungueltig.",
      });
      return;
    }

    if (request.method !== "POST" || request.url !== "/internal/verify/publish") {
      sendJson(response, 404, {
        ok: false,
        reason: "not_found",
        message: "Endpunkt nicht gefunden.",
      });
      return;
    }

    try {
      const body = await readJsonBody(request);
      const guildId = typeof body.guildId === "string" ? body.guildId.trim() : "";

      if (!/^\d{8,32}$/.test(guildId)) {
        sendJson(response, 400, {
          ok: false,
          reason: "guild_not_found",
          message: "Discord Guild ID fehlt oder ist ungueltig.",
        });
        return;
      }

      const result = await sendVerifyPanelForGuild(client, config, guildId);

      if (!result.ok) {
        sendJson(response, 400, {
          ok: false,
          reason: result.reason,
          message: "Verify-Panel konnte nicht veroeffentlicht werden.",
        });
        return;
      }

      sendJson(response, 200, {
        ok: true,
        message: "Verify-Panel veroeffentlicht.",
        channelId: result.channelId,
      });
    } catch (error) {
      logger.error("Interner Verify-Publish fehlgeschlagen", error);
      sendJson(response, 500, {
        ok: false,
        reason: "internal_error",
        message: "Interner Publish-Fehler.",
      });
    }
  });

  server.listen(config.internalApi.port, "127.0.0.1", () => {
    logger.success(
      `KlarBot interne API aktiv auf 127.0.0.1:${config.internalApi.port}`,
    );
  });

  return server;
}
