import { $ } from "bun"
import { realpathSync } from "fs"
import os from "os"
import path from "path"
import fs from "fs/promises"
import { iife } from "@/util/iife"

type TmpDirOptions<T> = {
  git?: boolean
  init?: (dir: string) => Promise<T>
  dispose?: (dir: string) => Promise<T>
}
export async function tmpdir<T>(options?: TmpDirOptions<T>) {
  const dirpath = path.join(os.tmpdir(), "opencode-test-" + Math.random().toString(36).slice(2))
  await $`mkdir -p ${dirpath}`.quiet()
  if (options?.git) {
    await $`git init`.cwd(dirpath).quiet()
    await $`git config user.email user@mail.com`.cwd(dirpath).quiet()
    await $`git config user.name Unnamed`.cwd(dirpath).quiet()
    await $`git commit --no-gpg-sign --allow-empty -m "root commit ${dirpath}"`.cwd(dirpath).quiet()
  }
  const extra = await options?.init?.(dirpath)
  const result = {
    [Symbol.asyncDispose]: async () => {
      await options?.dispose?.(dirpath)
      await $`rm -rf ${dirpath}`.quiet()
    },
    path: realpathSync(dirpath),
    extra: extra as T,
  }
  return result
}

export const XDG_DIRS = iife(() => {
  const home = path.join(os.tmpdir(), "oc-test")
  const configHome = path.join(home, "_config")
  const dataHome = path.join(home, "_data")
  const cacheHome = path.join(home, "_cache")
  const stateHome = path.join(home, "_state")

  return {
    home,
    configHome,
    dataHome,
    cacheHome,
    stateHome,
  }
})

export async function ensureXdgDirs() {
  const { home, configHome, dataHome, cacheHome, stateHome } = XDG_DIRS
  await fs.mkdir(home, { recursive: true })
  for await (const file of new Bun.Glob(`${home}/**`).scan()) {
    await fs.rm(file, { recursive: true })
  }

  process.env.HOME = home
  process.env.XDG_CONFIG_HOME = configHome
  process.env.XDG_DATA_HOME = dataHome
  process.env.XDG_CACHE_HOME = cacheHome
  process.env.XDG_STATE_HOME = stateHome

  await fs.mkdir(configHome, { recursive: true })
  await fs.mkdir(dataHome, { recursive: true })
  await fs.mkdir(cacheHome, { recursive: true })
  await fs.mkdir(stateHome, { recursive: true })

  ;(await import("@/util/log")).Log.init({
    print: false,
    dev: true,
    level: "DEBUG",
  })
}
