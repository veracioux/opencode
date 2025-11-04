import { type CommandOption } from "@/cli/cmd/tui/component/dialog-command"
import { Config } from "@/config/config"
import type { Agent, Model, OpencodeClient, Provider } from "@opencode-ai/sdk"
import { RGBA } from "@opentui/core"
import { createGlobalEmitter } from "@solid-primitives/event-bus"
import { afterEach, beforeAll, beforeEach, expect, mock } from "bun:test"
import { type Context } from "solid-js"
import os from "os"
import fsPromises from "fs/promises"
import fs from "fs"
import path from "path"
import { type testRenderTui } from "./fixture_"

const contextToUseFnMap = new Map<Context<unknown>, () => unknown>()
const nameToContextMap = new Map<string, Context<unknown>>()
const contextToNameMap = new Map<Context<unknown>, string>()

let knownUseFns: Awaited<ReturnType<typeof setUpProviderMocking>>

export async function setUpProviderMocking() {
  const { createSimpleContext } = await import("@/cli/cmd/tui/context/helper")
  const { useContext } = await import("solid-js")
  const global = await import("@/global")

  function ensureXdgDir(name: string) {
    let home = process.env.HOME
    if (!home?.startsWith("/tmp"))
      home = fs.mkdtempSync(path.join(os.tmpdir(), "opencode-test-"))
    const dir = path.join(home, name)
    fs.mkdirSync(dir, { recursive: true })
    return dir
  }
  mock.module("@/global", () => ({
    ...global,
    Global: {
      ...global.Global,
      Path: {
        ...global.Global.Path,
        get state() {
          return ensureXdgDir("state")
        },
        get config() {
          return ensureXdgDir("config")
        },
        get cache() {
          return ensureXdgDir("cache")
        },
        get home() {
          return ensureXdgDir("")
        },
        get data() {
          return ensureXdgDir("data")
        },
        get bin() {
          return ensureXdgDir("bin")
        },
        get log() {
          return ensureXdgDir("log")
        },
      } satisfies typeof global.Global.Path,
    }
  }))

  mock.module("@/cli/cmd/tui/context/helper.tsx", () => ({
    createSimpleContext(input: {
      name: string
      init: any
    }): ReturnType<typeof createSimpleContext> {
      const { provider, use, ctx } = createSimpleContext(input)
      const mockedProvider: typeof provider = (props) => {
        const mockedProviderValue = mockedProviderValues.get(use)
        return mockedProviderValue
          ? ctx.Provider({ value: mockedProviderValue, children: props.children })
          : provider(props)
      }
      contextToUseFnMap.set(ctx, use)
      nameToContextMap.set(input.name, ctx)
      contextToNameMap.set(ctx, input.name)
      return {
        provider: mockedProvider,
        use,
        ctx,
      } satisfies ReturnType<typeof createSimpleContext>
    },
  }))
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
        listen: mock(() => () => {}),
        emit: mock(),
        clear: mock(),
      },
    },
    useKV: {
      ready: true,
      set: mock(),
      get: mock(() => undefined),
      signal: mock(() => [() => undefined, (next: any) => {}] as const),
    },
    useCommandDialog: {
      trigger: mock(),
      keybinds: mock(),
      show: mock(() => {}),
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
              keybinds: Config.Keybinds.parse({}),
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
              providerID: "mock-provider-2",
              modelID: "mock-model-1",
            },
          } as Agent,
          {
            name: "mock-agent-3",
            model: {
              providerID: "mock-provider-2",
              modelID: "mock-model-2",
            },
          } as Agent,
        ],
        command: [],
        permission: {},
        config: {
          keybinds: Config.Keybinds.parse({}),
        },
        session: [],
        todo: {},
        message: {},
        part: {},
        lsp: [],
        mcp: {},
        formatter: [],
      },
      set: mock((...args: any[]) => {}),
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
  let tmpdir: string
  const utils = {
    testSetup: null as unknown as Awaited<ReturnType<typeof testRenderTui>>,
    homedir: null as unknown as string,
    renderOnceExpectMatchSnapshot: async function () {
      await this.testSetup!.renderOnce()
      const frame = this.testSetup!.captureCharFrame()
      expect(frame).toMatchSnapshot()
    },
    sleep(ms: number) {
      return new Promise((r) => setTimeout(r, ms))
    },
  }

  beforeAll(async () => {
    tmpdir = os.tmpdir()
    process.chdir(tmpdir)
  })
  beforeEach(async () => {
    utils.homedir = await fsPromises.mkdtemp(tmpdir + path.sep)
    process.env.HOME = utils.homedir
    process.env.TZ = "America/Los_Angeles"
  })
  afterEach(async () => {
    mock.restore()
    await fsPromises.rm(utils.homedir, { recursive: true })
  })
  afterEach(async () => {
    // Without this delay, some tests cause
    // error: EditBuffer is destroyed
    await new Promise((r) => setTimeout(r, 0))
    if (utils.testSetup) utils.testSetup.renderer.destroy()
  })

  return utils
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
