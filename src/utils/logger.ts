type LogLevel = "info" | "success" | "warn" | "error" | "debug";

const levelColors: Record<LogLevel, string> = {
  info: "\x1b[36m",
  success: "\x1b[32m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
  debug: "\x1b[90m",
};

const resetColor = "\x1b[0m";

function formatLog(level: LogLevel, message: string) {
  const prefix = `[KlarBot] [${level.toUpperCase()}]`;

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
