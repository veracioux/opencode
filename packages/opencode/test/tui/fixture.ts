import { createOpencodeClient } from "@opencode-ai/sdk"
import { afterEach, beforeAll, beforeEach, expect, mock } from "bun:test"
import { type Context } from "solid-js"
import os from "os"
import fs from "fs/promises"
import path from "path"
import { type testRenderTui } from "./fixture_"
import { Global } from "@/global"
import { YAML } from "bun"
import type { Config } from "@/config/config"

const contextToUseFnMap = new Map<Context<unknown>, () => unknown>()

let knownUseFns: Awaited<ReturnType<typeof setUpProviderMocking>>

export async function setUpProviderMocking() {
  const { useContext } = await import("solid-js")

  mock.module("solid-js", () => ({
    // ErrorBoundary: StubErrorBoundary,
    useContext(ctx: Context<any>) {
      const mockedValue = mockedProviderValues.get(contextToUseFnMap.get(ctx) as any)
      return mockedValue ?? useContext(ctx)
    },
  }))
  const _knownUseFns = {
    useRoute: await import("@/cli/cmd/tui/context/route").then((m) => m.useRoute),
    useExit: await import("@/cli/cmd/tui/context/exit").then((m) => m.useExit),
  } as const
  knownUseFns = _knownUseFns
  return _knownUseFns
}

const mockedProviderValues = new Map<() => any, any>()

type ProvidedValue<K extends keyof typeof knownUseFns> = ReturnType<(typeof knownUseFns)[K]>

export type MockConfig = {
  [key in keyof typeof knownUseFns]?:
    | boolean
    | ProvidedValue<key>
    | ((draft: ProvidedValue<key>) => ProvidedValue<key>)
}

export async function mockProviders<T extends MockConfig>(
  config?: T,
): Promise<
  Required<{
    [key in keyof MockConfig]: Awaited<ReturnType<(typeof knownUseFns)[key]>>
  }> & {
    [key in keyof T]: T[key] extends (...args: any[]) => any
      ? ReturnType<T[key]>
      : T[key] extends false
        ? never
        : T[key]
  }
> {
  const defaultConfig = {
    useRoute: {
      data: { type: "home" },
      navigate: mock(),
    },
    useExit: mock(() => undefined as never),
  } satisfies Partial<
    Record<keyof MockConfig, ReturnType<(typeof knownUseFns)[keyof typeof knownUseFns]>>
  >

  for (const key of Object.keys(knownUseFns) as (keyof MockConfig)[]) {
    const value = config?.[key]
    const useFn = knownUseFns[key]
    switch (true) {
      case value === true:
        mockedProviderValues.set(useFn, defaultConfig[key as keyof typeof defaultConfig])
        break
      case value === undefined:
        break
      case value === false:
        mockedProviderValues.delete(useFn)
        break
      case typeof value === "function":
        mockedProviderValues.set(useFn, value(mockedProviderValues.get(useFn)))
        break
      default:
        mockedProviderValues.set(useFn, value)
    }
  }

  return Object.fromEntries(
    Object.keys(knownUseFns).map((key) => {
      return [key, mockedProviderValues.get(knownUseFns[key as keyof MockConfig])]
    }),
  ) as any
}

export function setUpCommonHooksAndUtils() {
  // Provide some safety for the developer, so they don't accidentally delete their real home dir or its contents
  if (!process.env.HOME?.startsWith(os.tmpdir())) {
    throw new Error(
      "HOME is not set to a temp directory for the test. Check the test setup in ../preload.ts for issues",
    )
  }

  const utils = {
    homedir: process.env.HOME,
    projectDir: path.join(process.env.HOME, "project"),
    testSetup: undefined as unknown as Awaited<ReturnType<typeof testRenderTui>>,
    renderOnceExpectMatchSnapshot: async function () {
      await this.testSetup.renderOnce()
      const frame = this.testSetup!.captureCharFrame()
      expect(frame).toMatchSnapshot()
    },
    sleep(ms: number) {
      return new Promise((r) => setTimeout(r, ms))
    },
    async createIsolatedServer() {
      const { Server } = await import("@/server/server")

      return await this.withCwd(this.projectDir, async () => {
        const BUN_OPTIONS_BACKUP = process.env.BUN_OPTIONS
        process.env.BUN_OPTIONS = ""
        const server = Server.listen({
          port: 0,
          hostname: "127.0.0.1",
        })
        process.env.BUN_OPTIONS = BUN_OPTIONS_BACKUP
        const client = createOpencodeClient({
          baseUrl: server.url.toString(),
        })
        return {
          client,
          url: server.url.toString(),
          [Symbol.asyncDispose]: async function () {
            await server.stop(true)
          },
        }
      })
    },
    /** Execute cb in specified cwd */
    async withCwd<T>(newCwd: string, cb: () => T) {
      await fs.mkdir(newCwd, { recursive: true })
      const originalCwd = process.cwd()
      process.chdir(newCwd)
      try {
        return await cb()
      } finally {
        process.chdir(originalCwd)
      }
    },
  }

  const models = fetch("https://models.dev/api.json").then((res) => res.json())

  async function setUpOpencodeEnv() {
    const cleanup = await createStubFiles({
      "auth.json": {
        openai: {
          type: "api",
          key: "stub",
        },
      },
      "opencode.json": {
        model: "opencode/big-pickle",
      },
      "models.json": await models,
      "model.json": {
        recent: [
          {
            providerID: "openai",
            modelID: "gpt-5",
          },
        ],
      },
      agent: [
        {
          name: "docs",
          description: "Documentation agent",
          content: "Handles questions about project documentation.",
          model: "opencode/grok-code",
        },
      ],
      command: [
        {
          name: "e",
          description: "Short command",
          content: "blah blah",
        },
        {
          name: "long-command",
          description: "Long command",
          content: "blah blah",
        },
      ],
      misc: {
        [`${utils.projectDir}/files/1.txt`]: "Content of file 1",
        [`${utils.projectDir}/files/2.txt`]: "Content of file 2",
      },
    })
    return cleanup
  }

  beforeAll(async () => {
    await fs.mkdir(path.join(utils.homedir, "project"), { recursive: true })
    await setUpOpencodeEnv()
  })

  let originalCwd: string
  beforeEach(async () => {
    originalCwd = process.cwd()
    process.chdir(utils.projectDir)
  })
  afterEach(async () => {
    mock.restore()
    process.chdir(originalCwd)
    // Without this delay, some tests cause
    // error: EditBuffer is destroyed
    // seems due to opentui
    await new Promise((r) => setTimeout(r, 0))
    if (utils.testSetup) utils.testSetup.renderer.destroy()
  })

  return utils
}

export async function createStubFiles(files: {
  "auth.json"?: Record<string, unknown>
  "models.json"?: Record<string, unknown>
  "opencode.json"?: Config.Info
  "model.json"?: Record<string, unknown>
  /** List of templates for commands, defined as markdown files */
  command?: {
    name: string
    description: string
    content: string
  }[]
  agent?: {
    name: string
    description: string
    content: string
    model: string
  }[]
  misc?: Record<string, string>
}) {
  const toDelete: string[] = []

  async function createTextFile(pth: string, content: string) {
    await fs.mkdir(path.dirname(pth), { recursive: true })
    await fs.writeFile(pth, content)
    toDelete.push(pth)
  }
  async function createJSONFile(pth: string, content: any) {
    await createTextFile(pth, JSON.stringify(content, null, 2))
  }
  async function createMarkdownFile(pth: string, frontMatter: Record<string, any>, body: string) {
    const content = `
---
${YAML.stringify(frontMatter)}
---
${body}
`.trim()
    await createTextFile(pth, content)
  }

  // auth.json
  if (files["auth.json"])
    await createJSONFile(path.join(Global.Path.data, "auth.json"), files["auth.json"])

  // models.json
  if (files["models.json"])
    await createJSONFile(path.join(Global.Path.cache, "models.json"), files["models.json"])

  // global opencode.json
  if (files["opencode.json"])
    await createJSONFile(path.join(Global.Path.config, "opencode.json"), files["opencode.json"])

  // model.json
  if (files["model.json"])
    await createJSONFile(path.join(Global.Path.state, "model.json"), files["model.json"])

  // command
  for (const def of files.command ?? []) {
    const { name, content, ...rest } = def
    const cmdPath = path.join(Global.Path.config, "command", `${def.name}.md`)
    await createMarkdownFile(cmdPath, rest, def.content)
  }

  // agent
  for (const def of files.agent ?? []) {
    const { name, content, ...rest } = def
    const agentPath = path.join(Global.Path.config, "agent", `${def.name}.md`)
    await createMarkdownFile(agentPath, rest, def.content)
  }

  // misc files
  for (const [pth, content] of Object.entries(files.misc ?? {})) {
    await createTextFile(pth, content)
  }

  return {
    [Symbol.asyncDispose]: async () => {
      for (const file of toDelete) {
        await fs.rm(file, { recursive: true })
      }
    },
  }
}

/**
 * Common terminal sizes for testing
 */
export const SIZES = {
  NORMAL: { width: 100, height: 30 },
  MEDIUM: { width: 80, height: 25 },
  SMALL: { width: 60, height: 20 },
  TALL: { height: 40 },
} as const
