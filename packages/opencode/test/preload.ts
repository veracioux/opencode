import path from "path"
import fs from "fs/promises"
import os from "os"

// Make tests more deterministic
process.env.USER = "test-user"
process.env.TZ = "Etc/UTC"

const homedir = path.join(os.tmpdir(), "oc-test")
await fs.mkdir(homedir, { recursive: true })
for await (const file of new Bun.Glob(`${homedir}/**`).scan()) {
  await fs.rm(file, { recursive: true })
}

// NOTE: Prefixed with underscores to avoid clashing with real user XDG dirs
process.env.HOME = homedir
process.env.XDG_CONFIG_HOME = path.join(homedir, "_config")
process.env.XDG_DATA_HOME = path.join(homedir, "_data")
process.env.XDG_CACHE_HOME = path.join(homedir, "_cache")
process.env.XDG_STATE_HOME = path.join(homedir, "_state")

await fs.mkdir(process.env.XDG_CONFIG_HOME, { recursive: true })
await fs.mkdir(process.env.XDG_DATA_HOME, { recursive: true })
await fs.mkdir(process.env.XDG_CACHE_HOME, { recursive: true })
await fs.mkdir(process.env.XDG_STATE_HOME, { recursive: true })

;(await import("@/util/log")).Log.init({
  print: false,
  dev: true,
  level: "DEBUG",
})
