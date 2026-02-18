/**
 * Unified logging utility for the application
 * Logs are only enabled in development mode
 * Can optionally save logs to file
 */

type LogLevel = "debug" | "info" | "warn" | "error"

interface LoggerOptions {
  prefix?: string
  enabled?: boolean
  saveToFile?: boolean
}

// Global flag for file logging
let globalSaveToFile = false

export function setSaveToFile(enabled: boolean): void {
  globalSaveToFile = enabled
}

export function getSaveToFile(): boolean {
  return globalSaveToFile
}

class Logger {
  private prefix: string
  private enabled: boolean
  private saveToFile: boolean

  constructor(options: LoggerOptions = {}) {
    this.prefix = options.prefix || ""
    this.enabled = options.enabled ?? import.meta.env.DEV
    this.saveToFile = options.saveToFile ?? false
  }

  private formatMessage(
    _level: LogLevel,
    message: string,
    ..._args: any[]
  ): string {
    const timestamp = new Date().toISOString().split("T")[1].split(".")[0]
    const prefix = this.prefix ? `[${this.prefix}]` : ""
    return `${timestamp} ${prefix} ${message}`
  }

  private async saveLog(
    level: LogLevel,
    message: string,
    ...args: any[]
  ): Promise<void> {
    if (!globalSaveToFile && !this.saveToFile) return

    try {
      // Dynamically import to avoid circular dependency
      const { write_log } = await import("../api")
      const formattedArgs = args.length > 0 ? ` ${JSON.stringify(args)}` : ""
      await write_log(level, this.prefix, message + formattedArgs)
    } catch (error) {
      // Silently fail to avoid infinite loop
      console.error("Failed to save log:", error)
    }
  }

  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (!this.enabled) return

    const formattedMessage = this.formatMessage(level, message, ...args)

    switch (level) {
      case "debug":
        console.debug(formattedMessage, ...args)
        break
      case "info":
        console.info(formattedMessage, ...args)
        break
      case "warn":
        console.warn(formattedMessage, ...args)
        break
      case "error":
        console.error(formattedMessage, ...args)
        break
    }

    // Save to file asynchronously (don't await to avoid blocking)
    this.saveLog(level, message, ...args)
  }

  debug(message: string, ...args: any[]): void {
    this.log("debug", message, ...args)
  }

  info(message: string, ...args: any[]): void {
    this.log("info", message, ...args)
  }

  warn(message: string, ...args: any[]): void {
    this.log("warn", message, ...args)
  }

  error(message: string, ...args: any[]): void {
    this.log("error", message, ...args)
  }

  /**
   * Create a child logger with a new prefix
   */
  child(prefix: string): Logger {
    const childPrefix = this.prefix ? `${this.prefix}:${prefix}` : prefix
    return new Logger({
      prefix: childPrefix,
      enabled: this.enabled,
      saveToFile: this.saveToFile,
    })
  }
}

// Create module-specific loggers
export const createLogger = (module: string): Logger => {
  return new Logger({ prefix: module })
}

// Pre-configured loggers for common modules
export const logger = {
  config: createLogger("Config"),
  sync: createLogger("Sync"),
  search: createLogger("Search"),
  playback: createLogger("Playback"),
  api: createLogger("API"),
}

// Default export
export default logger
