import { type CommandOption } from "@/cli/cmd/tui/component/dialog-command"
import { createOpencodeClient, type Agent, type Model, type OpencodeClient, type Provider } from "@opencode-ai/sdk"
import { RGBA } from "@opentui/core"
import { createGlobalEmitter } from "@solid-primitives/event-bus"
import { afterEach, beforeAll, beforeEach, expect, mock } from "bun:test"
import { type Context } from "solid-js"
import os from "os"
import fs from "fs/promises"
import path from "path"
import { type testRenderTui } from "./fixture_"
import { Global } from "@/global"
import { YAML } from "bun"
import type { Config } from "@/config/config"
import models from "../fixture/models.json"

const contextToUseFnMap = new Map<Context<unknown>, () => unknown>()
const nameToContextMap = new Map<string, Context<unknown>>()
const contextToNameMap = new Map<Context<unknown>, string>()

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
    useTheme: await import("@/cli/cmd/tui/context/theme").then((m) => m.useTheme),
    useRoute: await import("@/cli/cmd/tui/context/route").then((m) => m.useRoute),
    useLocal: await import("@/cli/cmd/tui/context/local").then((m) => m.useLocal),
    useDialog: await import("@/cli/cmd/tui/ui/dialog").then((m) => m.useDialog),
    useKV: await import("@/cli/cmd/tui/context/kv").then((m) => m.useKV),
    useCommandDialog: await import("@/cli/cmd/tui/component/dialog-command").then(
      (m) => m.useCommandDialog,
    ),
    useSDK: await import("@/cli/cmd/tui/context/sdk").then((m) => m.useSDK),
    useKeybind: await import("@/cli/cmd/tui/context/keybind").then((m) => m.useKeybind),
    useSync: await import("@/cli/cmd/tui/context/sync").then((m) => m.useSync),
    useToast: await import("@/cli/cmd/tui/ui/toast").then((m) => m.useToast),
    useExit: await import("@/cli/cmd/tui/context/exit").then((m) => m.useExit),
    usePromptHistory: await import("@/cli/cmd/tui/component/prompt/history").then(
      (m) => m.usePromptHistory,
    ),
  } as const
  knownUseFns = _knownUseFns
  return _knownUseFns
}

const mockedProviderValues = new Map<() => any, any>()

type ProvidedValue<K extends keyof typeof knownUseFns> = ReturnType<(typeof knownUseFns)[K]>

type UseSDKProvidedValue = Omit<ProvidedValue<"useSDK">, "client"> & {
  client: OpencodeClientPlain
}

export type MockConfig = {
  [key in keyof typeof knownUseFns]?:
  | boolean
  | (key extends "useSDK"
    ? UseSDKProvidedValue | ((draft: UseSDKProvidedValue) => UseSDKProvidedValue)
    : ProvidedValue<key> | ((draft: ProvidedValue<key>) => ProvidedValue<key>))
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
  const { resolveTheme, THEMES, syntaxStyleFromTheme } = await import("@/cli/cmd/tui/context/theme")
  const defaultConfig = {
    useDialog: {
      clear: mock(),
      replace: mock(),
      stack: [] as any[],
      size: "medium",
      setSize: mock(),
    },
    useLocal: {
      model: {
        ready: true,
        current: () => ({
          modelID: "mock-model-1",
          providerID: "mock-provider-1",
        }),
        set: mock(),
        recent: () => [],
        cycle: mock(),
        parsed: mock(() => ({
          provider: "mock-provider-1",
          model: "mock-model-1",
        })),
      },
      agent: {
        list: () => [],
        current: () =>
          ({
            name: "mock",
          }) as Agent,
        color: mock(() => RGBA.fromHex("#ff0000")),
        set: mock(),
        move: mock(),
      },
      setInitialPrompt: {
        listen: mock(() => () => { }),
        emit: mock(),
        clear: mock(),
      },
    },
    useKV: {
      ready: true,
      set: mock(),
      get: mock(() => undefined),
      signal: mock(() => [() => undefined, (next: any) => { }] as const),
    },
    useCommandDialog: {
      trigger: mock(),
      keybinds: mock(),
      show: mock(() => { }),
      register: mock(),
      options: [] as CommandOption[],
      suspended: mock(() => false),
    },
    useRoute: {
      data: { type: "home" },
      navigate: mock(),
    },
    useSDK: {
      event: createGlobalEmitter(),
      client: {
        app: {
          async agents() {
            return {
              data: [
                {
                  name: "mock-agent-1",
                  description: "Mock Agent 1 description",
                  mode: "primary",
                  model: {
                    providerID: "mock-provider-1",
                    modelID: "mock-model-1",
                  },
                } as Agent,
                {
                  name: "mock-agent-2",
                  description: "Mock Agent 2 description",
                  mode: "subagent",
                  model: {
                    providerID: "mock-provider-1",
                    modelID: "mock-model-1",
                  },
                } as Agent,
              ],
            }
          },
        },
        config: {
          async get() {
            return {
              keybinds: (await import("@/config/config")).Config.Keybinds.parse({}),
            }
          },
          providers: async () => {
            return {
              data: {
                providers: [
                  {
                    name: "Mock Provider 1",
                    id: "mock-provider-1",
                    models: {
                      "mock-model-1": {
                        name: "Mock Model 1",
                      } as Model,
                      "mock-model-2": {
                        name: "Mock Model 2",
                      } as Model,
                    },
                  } as Partial<Provider>,
                ],
              },
            } as any
          },
        } as any,
      } as any,
    },
    useKeybind: {
      match: mock((keybind, evt) => false),
      all: [] as any,
      parse: mock((evt) => ({}) as any),
      print: mock((key) => ""),
      leader: false,
    },
    useSync: {
      data: {
        ready: true,
        provider: [
          {
            id: "mock-provider-1",
            name: "Mock Provider 1",
            models: {
              "mock-model-1": {
                name: "Mock Model 1",
                id: "mock-model-1",
              } as Model,
              "mock-model-2": {
                name: "Mock Model 2",
                id: "mock-model-2",
              } as Model,
            },
            env: [],
          },
          {
            id: "mock-provider-2",
            name: "Mock Provider 2",
            models: {
              "mock-model-3": {
                name: "Mock Model 3",
                id: "mock-model-3",
              } as Model,
              "mock-model-4": {
                name: "Mock Model 4",
                id: "mock-model-4",
              } as Model,
            },
            env: [],
          },
        ],
        agent: [
          {
            name: "mock-agent-1",
            model: {
              providerID: "mock-provider-1",
              modelID: "mock-model-1",
            },
          } as Agent,
          {
            name: "mock-agent-2",
            model: {
              providerID: "mock-provider-1",
              modelID: "mock-model-2",
            },
          } as Agent,
          {
            name: "mock-agent-3",
            model: {
              providerID: "mock-provider-2",
              modelID: "mock-model-3",
            },
          } as Agent,
        ],
        command: [],
        permission: {},
        config: {
          keybinds: (await import("@/config/config")).Config.Keybinds.parse({}),
        },
        session: [],
        todo: {},
        message: {},
        part: {},
        lsp: [],
        mcp: {},
        formatter: [],
      },
      set: mock((...args: any[]) => { }),
      ready: true,
      session: {
        get: mock(),
        status: mock((sessionID) => "idle" as const),
        sync: mock(() => Promise.resolve()),
      },
    },
    useTheme: {
      theme: resolveTheme(THEMES.opencode, "dark"),
      selected: "opencode",
      syntax: mock(() => syntaxStyleFromTheme(resolveTheme(THEMES.opencode, "dark"))),
      mode: mock(() => "dark" as const),
      ready: true,
      set: mock(),
      setMode: mock(),
    },
    useToast: {
      show: mock(),
      error: mock(),
      currentToast: null,
    },
    useExit: mock(() => undefined as never),
    usePromptHistory: {
      move: mock(),
      append: mock(),
    },
  } satisfies Record<keyof MockConfig, ReturnType<(typeof knownUseFns)[keyof typeof knownUseFns]>>

  for (const key of Object.keys(knownUseFns) as (keyof MockConfig)[]) {
    const value = config?.[key]
    const useFn = knownUseFns[key]
    switch (true) {
      case value === true:
        mockedProviderValues.set(useFn, defaultConfig[key])
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

export type OpencodeClientPlain = {
  [key in keyof OpencodeClient]: {
    [K in keyof OpencodeClient[key]]: OpencodeClient[key][K]
  }
}

export function setUpCommonHooksAndUtils() {
  // Provide some safety for the developer, so they don't accidentally delete their real home dir or its contents
  if (!process.env.HOME?.startsWith(os.tmpdir())) {
    throw new Error("HOME is not set to a temp directory for the test. Check the test setup in ../preload.ts for issues")
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

  async function setUpOpencodeEnv() {
    const cleanup = await createStubFiles({
      "auth.json": {
        openai: {
          type: "api",
          key: "stub"
        },
      },
      "opencode.json": {
        model: "opencode/big-pickle",
      },
      "models.json": models,
      agent: [
        {
          name: "docs",
          description: "0 - Documentation agent",
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
        }
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
    await new Promise((r) => setTimeout(r, 0))
    if (utils.testSetup) utils.testSetup.renderer.destroy()
  })

  return utils
}

export async function createStubFiles(files: {
  "auth.json"?: Record<string, unknown>,
  "models.json"?: Record<string, unknown>,
  "opencode.json"?: Config.Info,
  /** List of templates for commands, defined as markdown files */
  command?: {
    name: string,
    description: string,
    content: string,
  }[],
  agent?: {
    name: string,
    description: string,
    content: string,
    model: string,
  }[],
  misc?: Record<string, string>,
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
    }
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
