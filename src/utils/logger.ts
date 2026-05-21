type LogLevel = "info" | "warn" | "error" | "debug";

function formatLog(level: LogLevel, message: string) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [KlarBot] [${level.toUpperCase()}] ${message}`;
}

export const logger = {
  info(message: string, meta?: unknown) {
    console.info(formatLog("info", message), meta ?? "");
  },

  warn(message: string, meta?: unknown) {
    console.warn(formatLog("warn", message), meta ?? "");
  },

  error(message: string, error?: unknown) {
    console.error(formatLog("error", message), error ?? "");
  },

  debug(message: string, meta?: unknown) {
    if (process.env.DEBUG === "true") {
      console.debug(formatLog("debug", message), meta ?? "");
    }
  },
};
