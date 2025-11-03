import { type CommandOption } from "@/cli/cmd/tui/component/dialog-command"
import type { Agent } from "@opencode-ai/sdk"
import { RGBA } from "@opentui/core"
import { createEventBus, createGlobalEmitter } from "@solid-primitives/event-bus"
import { mock } from "bun:test"
import { type Context } from "solid-js"

const contextToUseFnMap = new Map<Context<any>, () => any>()
const contextNameToCtxMap = new Map<string, Context<any>>()

let knownUseFns: Awaited<ReturnType<typeof setUpProviderMocks>>

export async function setUpProviderMocks() {
  const { createSimpleContext } = await import("@/cli/cmd/tui/context/helper")
  const { useContext } = await import("solid-js")
  mock.module("@/cli/cmd/tui/context/helper.tsx", () => ({
    createSimpleContext(input: { name: string, init: any }): ReturnType<typeof createSimpleContext> {
      const { provider, use, ctx } = createSimpleContext(input)
      const mockedProvider: typeof provider = (props) => {
        const mockedProviderValue = mockedProviderValues.get(use)
        return mockedProviderValue ? ctx.Provider({ value: mockedProviderValue, children: props.children }) : provider(props)
      }
      contextToUseFnMap.set(ctx, use)
      contextNameToCtxMap.set(input.name, ctx)
      return {
        provider: mockedProvider,
        use,
        ctx,
      } satisfies ReturnType<typeof createSimpleContext>
    }
  }))
  mock.module("solid-js", () => ({
    useContext(ctx: Context<any>) {
      const mockedValue = mockedProviderValues.get(contextToUseFnMap.get(ctx) as any)
      return mockedValue ?? useContext(ctx)
    },
  }))
  const _knownUseFns = {
    useTheme: await import("@/cli/cmd/tui/context/theme").then(m => m.useTheme),
    useRoute: await import("@/cli/cmd/tui/context/route").then(m => m.useRoute),
    useLocal: await import("@/cli/cmd/tui/context/local").then(m => m.useLocal),
    useDialog: await import("@/cli/cmd/tui/ui/dialog").then(m => m.useDialog),
    useKV: await import("@/cli/cmd/tui/context/kv").then(m => m.useKV),
    useCommandDialog: await import("@/cli/cmd/tui/component/dialog-command").then(m => m.useCommandDialog),
    useSDK: await import("@/cli/cmd/tui/context/sdk").then(m => m.useSDK),
    useKeybind: await import("@/cli/cmd/tui/context/keybind").then(m => m.useKeybind),
    useSync: await import("@/cli/cmd/tui/context/sync").then(m => m.useSync),
    useToast: await import("@/cli/cmd/tui/ui/toast").then(m => m.useToast),
    useExit: await import("@/cli/cmd/tui/context/exit").then(m => m.useExit),
    usePromptHistory: await import("@/cli/cmd/tui/component/prompt/history").then(m => m.usePromptHistory),
  } as const
  knownUseFns = _knownUseFns
  return _knownUseFns
}

const mockedProviderValues = new Map<() => any, any>()

type MockConfig = {
  [key in keyof typeof knownUseFns]?:
  | ReturnType<typeof knownUseFns[key]>
  | ((draft: ReturnType<typeof knownUseFns[key]> | undefined) => ReturnType<typeof knownUseFns[key]>)
  | boolean
}

export async function mockProviders(config?: MockConfig) {
  const { resolveTheme, THEMES, syntaxStyleFromTheme } = await import("@/cli/cmd/tui/context/theme")
  const defaultConfig = {
    useDialog:
    {
      clear: mock(),
      replace: mock(),
      stack: [] as any[],
      size: "medium",
      setSize: mock(),
      allClosedEvent: createEventBus<void>(),
    },
    useLocal: {
      model: {
        ready: true,
        current: () => ({
          modelID: "local-model-1",
          providerID: "local-provider-1",
        }),
        set: mock(),
        recent: () => [{
          providerID: "local-provider-1",
          modelID: "local-model-1",
        }],
        cycle: mock(),
        parsed: mock(() => ({
          provider: "local-provider-1",
          model: "local-model-1",
        })),
      },
      agent: {
        list: () => [],
        current: () => ({
          name: "mock",
        } as Agent),
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
      signal: mock(() => [
        () => undefined,
        (next: any) => { },
      ] as const),
    },
    useCommandDialog: {
      trigger: mock(),
      keybinds: mock(),
      show: mock(() => { }),
      register: mock(),
      options: [] as CommandOption[],
    },
    useRoute:
    {
      data: { type: "home" },
      navigate: mock(),
    },
    useSDK: {
      event: createGlobalEmitter(),
      client: {} as any,
    },
    useKeybind: {
      match: mock((keybind, evt) => false),
      all: [] as any,
      parse: mock((evt) => ({})),
      print: mock((key) => ""),
      leader: false,
    },
    useSync: {
      data: {
        ready: true,
        provider: [],
        agent: [],
        command: [],
        permission: {},
        config: {},
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
        sync: mock(),
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
  } satisfies Record<keyof MockConfig, ReturnType<typeof knownUseFns[keyof typeof knownUseFns]>>

  for (const key of Object.keys(knownUseFns) as (keyof MockConfig)[]) {
    const value = config?.[key]
    const useFn = knownUseFns[key]
    switch (true) {
      case value === true:
      case value === undefined:
        mockedProviderValues.set(useFn, defaultConfig[key])
        break
      case typeof value === "function":
        mockedProviderValues.set(useFn, value(mockedProviderValues.get(useFn)))
        break
      default:
        mockedProviderValues.set(useFn, value)
    }
  }
}
