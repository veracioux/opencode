import { $ } from "bun"
import { realpathSync } from "fs"
import os from "os"
import path from "path"
import { mock } from "bun:test"
import { Identifier } from "@/id/id"

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

export async function mockIdentifiers() {
  const { Identifier } = await import("@/id/id")
  const lastIndexPerPrefix: Record<string, number> = {}
  mock.module("@/id/id", () => ({
    Identifier: {
      ...Identifier,
      ascending(prefix, given) {
        if (given) {
          return Identifier.ascending(prefix, given)
        }
        const lastIndex = lastIndexPerPrefix[prefix] ?? 0
        const newIndex = lastIndex + 1
        lastIndexPerPrefix[prefix] = newIndex
        return `${prefix}_${newIndex}`
      },
    } as typeof Identifier,
  }))
}
