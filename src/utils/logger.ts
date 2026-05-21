type LogLevel =
  | "info"
  | "success"
  | "moderation"
  | "creator"
  | "roles"
  | "giveaway"
  | "welcome"
  | "template"
  | "ticketLog"
  | "transcript"
  | "warn"
  | "error"
  | "debug";

const levelColors: Record<LogLevel, string> = {
  info: "\x1b[36m",
  success: "\x1b[32m",
  moderation: "\x1b[35m",
  creator: "\x1b[95m",
  roles: "\x1b[34m",
  giveaway: "\x1b[33m",
  welcome: "\x1b[36m",
  template: "\x1b[94m",
  ticketLog: "\x1b[96m",
  transcript: "\x1b[92m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
  debug: "\x1b[90m",
};

const levelLabels: Record<LogLevel, string> = {
  info: "INFO",
  success: "SUCCESS",
  moderation: "MODERATION",
  creator: "CREATOR",
  roles: "ROLES",
  giveaway: "GIVEAWAY",
  welcome: "WELCOME",
  template: "TEMPLATE",
  ticketLog: "TICKET_LOG",
  transcript: "TRANSCRIPT",
  warn: "WARN",
  error: "ERROR",
  debug: "DEBUG",
};

const resetColor = "\x1b[0m";

function formatLog(level: LogLevel, message: string) {
  const prefix = `[KlarBot] [${levelLabels[level]}]`;

  if (process.env.NO_COLOR === "true") {
    return `${prefix} ${message}`;
  }

  return `${levelColors[level]}${prefix}${resetColor} ${message}`;
}

function writeLog(
  level: LogLevel,
  writer: (message?: unknown, ...optionalParams: unknown[]) => void,
  message: string,
  meta?: unknown,
) {
  if (meta === undefined) {
    writer(formatLog(level, message));
    return;
  }

  writer(formatLog(level, message), meta);
}

export const logger = {
  info(message: string, meta?: unknown) {
    writeLog("info", console.info, message, meta);
  },

  success(message: string, meta?: unknown) {
    writeLog("success", console.info, message, meta);
  },

  moderation(message: string, meta?: unknown) {
    writeLog("moderation", console.info, message, meta);
  },

  creator(message: string, meta?: unknown) {
    writeLog("creator", console.info, message, meta);
  },

  roles(message: string, meta?: unknown) {
    writeLog("roles", console.info, message, meta);
  },

  giveaway(message: string, meta?: unknown) {
    writeLog("giveaway", console.info, message, meta);
  },

  welcome(message: string, meta?: unknown) {
    writeLog("welcome", console.info, message, meta);
  },

  template(message: string, meta?: unknown) {
    writeLog("template", console.info, message, meta);
  },

  ticketLog(message: string, meta?: unknown) {
    writeLog("ticketLog", console.info, message, meta);
  },

  transcript(message: string, meta?: unknown) {
    writeLog("transcript", console.info, message, meta);
  },

  warn(message: string, meta?: unknown) {
    writeLog("warn", console.warn, message, meta);
  },

  error(message: string, error?: unknown) {
    writeLog("error", console.error, message, error);
  },

  debug(message: string, meta?: unknown) {
    if (process.env.DEBUG === "true") {
      writeLog("debug", console.debug, message, meta);
    }
  },
};
