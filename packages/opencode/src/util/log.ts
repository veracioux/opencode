import path from "path"
import fs from "fs/promises"
import { Global } from "../global"
import z from "zod"

export namespace Log {
  export const Level = z.enum(["DEBUG", "INFO", "WARN", "ERROR"]).meta({ ref: "LogLevel", description: "Log level" })
  export type Level = z.infer<typeof Level>

  const levelPriority: Record<Level, number> = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
  }

  let level: Level = "INFO"

  function shouldLog(input: Level): boolean {
    return levelPriority[input] >= levelPriority[level]
  }

  export type Logger = {
    log(level: Level, message?: any, extra?: Record<string, any>): void,
    debug(message?: any, extra?: Record<string, any>): void
    info(message?: any, extra?: Record<string, any>): void
    error(message?: any, extra?: Record<string, any>): void
    warn(message?: any, extra?: Record<string, any>): void
    tag(key: string, value: string): Logger
    clone(): Logger
    time(
      message: string,
      extra?: Record<string, any>,
    ): {
      stop(): void
      [Symbol.dispose](): void
    }
    /** Clone the logger with the specified options. */
    opt(options: LoggerOptions): Logger
  }

  type LoggerOptions = {
    /**
     * If true, the logger will print to stderr even if printing to stderr was not explicitly enabled.
     * When undefined, error messages will be printed to stderr by default.
     */
    important?: boolean
  }

  const loggers = new Map<string, Logger>()

  export const Default = create({ service: "default" })

  export interface Options {
    print: boolean
    dev?: boolean
    level?: Level
  }

  let logpath = ""
  export function file() {
    return logpath
  }

  let printToStderr = false
  let logFileWriter: Bun.FileSink | null = null

  export async function init(options: Options) {
    if (options.level) level = options.level
    cleanup(Global.Path.log)
    if (options.print) {
       printToStderr = true
       return
    }
    logpath = path.join(
      Global.Path.log,
      options.dev ? "dev.log" : new Date().toISOString().split(".")[0].replace(/:/g, "") + ".log",
    )
    const logfile = Bun.file(logpath)
    logFileWriter = logfile.writer()
    await fs.truncate(logpath).catch(() => {})
  }

  async function cleanup(dir: string) {
    const glob = new Bun.Glob("????-??-??T??????.log")
    const files = await Array.fromAsync(
      glob.scan({
        cwd: dir,
        absolute: true,
      }),
    )
    if (files.length <= 5) return

    const filesToDelete = files.slice(0, -10)
    await Promise.all(filesToDelete.map((file) => fs.unlink(file).catch(() => {})))
  }

  function formatError(error: Error, depth = 0): string {
    const result = error.message
    return error.cause instanceof Error && depth < 10
      ? result + " Caused by: " + formatError(error.cause, depth + 1)
      : result
  }

  let last = Date.now()
  export function create(tags?: Record<string, any>) {
    tags = tags || {}

    const service = tags["service"]
    if (service && typeof service === "string") {
      const cached = loggers.get(service)
      if (cached) {
        return cached
      }
    }

    function build(message: any, extra?: Record<string, any>) {
      const prefix = Object.entries({
        ...tags,
        ...extra,
      })
        .filter(([_, value]) => value !== undefined && value !== null)
        .map(([key, value]) => {
          const prefix = `${key}=`
          if (value instanceof Error) return prefix + formatError(value)
          if (typeof value === "object") return prefix + JSON.stringify(value)
          return prefix + value
        })
        .join(" ")
      const next = new Date()
      const diff = next.getTime() - last
      last = next.getTime()
      return [next.toISOString().split(".")[0], "+" + diff + "ms", prefix, message].filter(Boolean).join(" ") + "\n"
    }
    const result: Logger & { _options: LoggerOptions } = {
      _options: {
        important: undefined,
      },
      log(level: Level, message?: any, extra?: Record<string, any>) {
        if (shouldLog(level)) {
          write(level, level + " " + build(message, extra), this._options)
        }
      },
      debug(message?: any, extra?: Record<string, any>) {
        this.log("DEBUG", message, extra)
      },
      info(message?: any, extra?: Record<string, any>) {
        this.log("INFO", message, extra)
      },
      error(message?: any, extra?: Record<string, any>) {
        this.log("ERROR", message, extra)
      },
      warn(message?: any, extra?: Record<string, any>) {
        this.log("WARN", message, extra)
      },
      tag(key: string, value: string) {
        if (tags) tags[key] = value
        return result
      },
      clone() {
        return Log.create({ ...tags })
      },
      time(message: string, extra?: Record<string, any>) {
        const now = Date.now()
        result.info(message, { status: "started", ...extra })
        function stop() {
          result.info(message, {
            status: "completed",
            duration: Date.now() - now,
            ...extra,
          })
        }
        return {
          stop,
          [Symbol.dispose]() {
            stop()
          },
        }
      },
      opt(options: LoggerOptions) {
        const logger = this.clone() as Logger & { _options: LoggerOptions }
        logger._options = options
        return logger
      }
    }

    if (service && typeof service === "string") {
      loggers.set(service, result)
    }

    return result
  }

  let messageQueue: { level: Level, message: string }[] = []
  let backgroundMode = false

  function write(level: Level, message: string, options?: { ignoreFile?: boolean, important?: boolean }) {
    const shouldWriteToFile = !options?.ignoreFile && !printToStderr && !!logFileWriter
    const isImportant = options?.important ?? (levelPriority[level] >= levelPriority["ERROR"])
    const shouldWriteToStderr = printToStderr || isImportant
    if (shouldWriteToFile) {
      logFileWriter!.write(message)
      logFileWriter!.flush()
    }
    if (shouldWriteToStderr) {
      if (backgroundMode) messageQueue.push({ level, message })
      else process.stderr.write(message)
    }
  }

  /**
   * Collect log messages in the background, to be flushed to stderr on-demand later.
   */
  export function setBackgroundMode(value: boolean) {
    backgroundMode = value
  }

  /**
   * Flush collected background log messages to stderr.
   */
  export function flushBackgroundLogs() {
    for (const entry of messageQueue) {
      write(entry.level, entry.message, { ignoreFile: true })
    }
    messageQueue = []
  }
}
