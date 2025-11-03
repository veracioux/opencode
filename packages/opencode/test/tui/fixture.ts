import type { CommandOption } from "@/cli/cmd/tui/component/dialog-command"
import type { PromptInfo } from "@/cli/cmd/tui/component/prompt/history"
import { resolveTheme, syntaxStyleFromTheme, THEMES } from "@/cli/cmd/tui/context/theme"
import type { Agent } from "@opencode-ai/sdk"
import { RGBA } from "@opentui/core"
import { createEventBus, createGlobalEmitter } from "@solid-primitives/event-bus"
import { mock } from "bun:test"

type ReturnTypes = Readonly<{
  useTheme: ReturnType<typeof import("@/cli/cmd/tui/context/theme").useTheme>
  useRoute: ReturnType<typeof import("@/cli/cmd/tui/context/route").useRoute>
  useLocal: ReturnType<typeof import("@/cli/cmd/tui/context/local").useLocal>
  useDialog: ReturnType<typeof import("@/cli/cmd/tui/ui/dialog").useDialog>
  useKV: ReturnType<typeof import("@/cli/cmd/tui/context/kv").useKV>
  useCommandDialog: ReturnType<typeof import("@/cli/cmd/tui/component/dialog-command").useCommandDialog>
  useSDK: ReturnType<typeof import("@/cli/cmd/tui/context/sdk").useSDK>
  useKeybind: ReturnType<typeof import("@/cli/cmd/tui/context/keybind").useKeybind>
  useSync: ReturnType<typeof import("@/cli/cmd/tui/context/sync").useSync>
  useToast: ReturnType<typeof import("@/cli/cmd/tui/ui/toast").useToast>
  useExit: ReturnType<typeof import("@/cli/cmd/tui/context/exit").useExit>
  usePromptHistory: ReturnType<typeof import("@/cli/cmd/tui/component/prompt/history").usePromptHistory>
}>

const knownUseFns = {
  useTheme: "@/cli/cmd/tui/context/theme.tsx",
  useRoute: "@/cli/cmd/tui/context/route.tsx",
  useLocal: "@/cli/cmd/tui/context/local.tsx",
  useDialog: "@/cli/cmd/tui/ui/dialog.tsx",
  useKV: "@/cli/cmd/tui/context/kv.tsx",
  useCommandDialog: "@/cli/cmd/tui/component/dialog-command.tsx",
  useSDK: "@/cli/cmd/tui/context/sdk.tsx",
  useKeybind: "@/cli/cmd/tui/context/keybind.tsx",
  useSync: "@/cli/cmd/tui/context/sync.tsx",
  useToast: "@/cli/cmd/tui/ui/toast.tsx",
  useExit: "@/cli/cmd/tui/context/exit.tsx",
  usePromptHistory: "@/cli/cmd/tui/component/prompt/history.tsx",
} satisfies Readonly<Record<keyof ReturnTypes, string>>

const mockedUseFnValues = new Map<readonly [string, string], any>()

export async function mockUseFn
  <TFnName extends keyof typeof knownUseFns, AllowPartial extends boolean = false>
  (useFnName: TFnName, providedValue: AllowPartial extends true ? Partial<ReturnTypes[TFnName]> : ReturnTypes[TFnName], allowPartial?: AllowPartial) {
  const modulePath = (knownUseFns as any)[useFnName]

  if (!modulePath)
    throw new Error(`Unknown module path for the provided use function: ${useFnName}`)

  const funcKey = [modulePath, useFnName] as const

  const returnValue = { ...(mockedUseFnValues.get(funcKey)), ...providedValue } as ReturnTypes[TFnName]

  const mockedFn = mock(() => (returnValue satisfies ReturnTypes[TFnName]))
  const mockedModule = {
    [useFnName]: mockedFn,
  }

  mock.module(modulePath, () => mockedModule)

  delete require.cache[require.resolve(modulePath)]

  mockedUseFnValues.set(funcKey, returnValue)

  return {
    fn: mockedFn,
    providedValue: returnValue,
  }
}

const allClosedEvent = createEventBus<void>()

export async function setUpDefaultMocks(include: (keyof ReturnTypes)[] = Object.keys(knownUseFns) as (keyof ReturnTypes)[]) {
  const getters = {
    useDialog: () => mockUseFn(
      "useDialog",
      {
        clear: mock(),
        replace: mock(),
        stack: [] as any[],
        size: "medium",
        setSize: mock(),
        allClosedEvent,
      },
    ),
    useLocal: () => mockUseFn(
      "useLocal",
      {
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
    ),
    useKV: () => mockUseFn("useKV", {
      ready: true,
      set: mock(),
      get: mock(() => undefined),
      signal: mock(() => [
        () => undefined,
        (next: any) => { },
      ] as const),
    }),
    useCommandDialog: () => mockUseFn(
      "useCommandDialog",
      {
        trigger: mock(),
        keybinds: mock(),
        show: mock(() => { }),
        register: mock(),
        options: [] as CommandOption[],
      },
    ),
    useRoute: () => mockUseFn(
      "useRoute",
      {
        data: { type: "home" },
        navigate: mock(),
      },
    ),
    useSDK: () => mockUseFn(
      "useSDK",
      {
        event: createGlobalEmitter(),
        client: {} as any,
      },
    ),
    useKeybind: () => mockUseFn(
      "useKeybind",
      {
        match: mock((keybind, evt) => false),
        all: [] as any,
        parse: mock((evt) => ({})),
        print: mock((key) => ""),
        leader: false,
      },
    ),
    useSync: () => mockUseFn(
      "useSync",
      {
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
    ),
    useTheme: () => mockUseFn(
      "useTheme",
      {
        theme: resolveTheme(THEMES.opencode, "dark"),
        selected: "opencode",
        syntax: mock(() => syntaxStyleFromTheme(resolveTheme(THEMES.opencode, "dark"))),
        mode: mock(() => "dark" as const),
        ready: true,
        set: mock(),
        setMode: mock(),
      },
    ),
    useToast: () => mockUseFn(
      "useToast",
      {
        show: mock(),
        error: mock(),
        currentToast: null,
      },
    ),
    useExit: () => mockUseFn(
      "useExit",
      mock(() => undefined as never),
    ),
    usePromptHistory: () => mockUseFn(
      "usePromptHistory",
      {
        move: mock(),
        append: mock(),
      },
    )
  } satisfies {
    [key in keyof ReturnTypes]?: () => ReturnType<typeof mockUseFn<key, false>>
  }

  return Promise.all(include.map((useFnName) => getters[useFnName]()))
}
