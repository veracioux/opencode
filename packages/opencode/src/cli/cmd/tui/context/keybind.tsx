import { createMemo } from "solid-js"
import { useSync } from "@tui/context/sync"
import { Keybind } from "@/util/keybind"
import { pipe, mapValues } from "remeda"
import type { KeybindsConfig } from "@opencode-ai/sdk"
import type { ParsedKey, Renderable } from "@opentui/core"
import { createStore } from "solid-js/store"
import { useKeyboard, useRenderer } from "@opentui/solid"
import { createSimpleContext } from "./helper"
import { PRIORITY, state } from "./keybind_"
import { Config } from "@/config/config"

export const { use: useKeybind, provider: KeybindProvider } = createSimpleContext({
  name: "Keybind",
  init: () => {
    const sync = useSync()
    const userKeybinds = createMemo(() => {
      return pipe(
        sync.data.config.keybinds ?? {},
        mapValues((value) => Keybind.parse(value)),
      )
    })

    useKeyboard(async (evt) => {
      if (!store.leader && result.match("leader", evt)) {
        leader(true)
        return
      }

      if (store.leader && evt.name) {
        setImmediate(() => {
          if (focus && renderer.currentFocusedRenderable === focus) {
            focus.focus()
          }
          leader(false)
        })
      }
    })

    function parse(evt: ParsedKey): Keybind.Info {
      if (evt.name === "\x1F")
        return {
          ctrl: true,
          name: "_",
          shift: false,
          leader: false,
          meta: false,
        }
      return {
        ctrl: evt.ctrl,
        name: evt.name,
        shift: evt.shift,
        leader: store.leader,
        meta: evt.meta,
      }
    }

    // TODO: I will make the contents of state inline later
    const _KeybindRegistration = state(parse, () => userKeybinds().leader![0]!)

    const keybinds = createMemo(() => ({
      global: {
        ...pipe(
          sync.data.config.keybinds ?? {},
          mapValues((value) => new _KeybindRegistration(value))
        ),
        command_list: new _KeybindRegistration(sync.data.config.keybinds?.command_list ?? Config.Keybinds.parse({}).command_list, PRIORITY.COMMAND_LIST),
        console_toggle: new _KeybindRegistration("meta+shift+d"),
        toggle_debug_ovelay: new _KeybindRegistration("meta+t"),
      },
      permission: {
        once: new _KeybindRegistration("return"),
        always: new _KeybindRegistration("a"),
        reject: new _KeybindRegistration(["d", "escape"]),
      },
      itemSelection: {
        up: new _KeybindRegistration(["up", "ctrl+p"], PRIORITY.DIALOG),
        down: new _KeybindRegistration(["down", "ctrl+n"], PRIORITY.DIALOG),
        pageup: new _KeybindRegistration("pageup", PRIORITY.DIALOG),
        pagedown: new _KeybindRegistration("pagedown", PRIORITY.DIALOG),
        return: new _KeybindRegistration("return", PRIORITY.DIALOG),
        cancel: new _KeybindRegistration("escape", PRIORITY.DIALOG),
        select: new _KeybindRegistration(["return", "tab"], PRIORITY.DIALOG),
      },
      autocomplete: {
        "@": new _KeybindRegistration("@"),
        "/": new _KeybindRegistration("/"),
      },
      dialog: {
        close: new _KeybindRegistration("escape", PRIORITY.DIALOG),
        help: {
          close: new _KeybindRegistration(["escape", "return"], PRIORITY.DIALOG),
        },
        alert: {
          close: new _KeybindRegistration(["return"], PRIORITY.DIALOG),
        },
        confirm: {
          submit: new _KeybindRegistration("return", PRIORITY.DIALOG),
          // TODO: feature suggestion: add tab?
          cycleFocusedButton: new _KeybindRegistration(["left", "right"], PRIORITY.DIALOG),
        },
        session: {
          delete: new _KeybindRegistration("ctrl+d", PRIORITY.DIALOG),
          rename: new _KeybindRegistration("ctrl+r", PRIORITY.DIALOG)
        },
      }
    } as const))

    const [store, setStore] = createStore({
      leader: false,
    })
    const renderer = useRenderer()

    let focus: Renderable | null
    let timeout: NodeJS.Timeout
    function leader(active: boolean) {
      if (active) {
        setStore("leader", true)
        focus = renderer.currentFocusedRenderable
        focus?.blur()
        if (timeout) clearTimeout(timeout)
        timeout = setTimeout(() => {
          if (!store.leader) return
          leader(false)
          if (focus) {
            focus.focus()
          }
        }, 2000)
        return
      }

      if (!active) {
        if (focus && !renderer.currentFocusedRenderable) {
          focus.focus()
        }
        setStore("leader", false)
      }
    }

    const result = {
      get all() {
        return userKeybinds()
      },
      get leader() {
        return store.leader
      },
      parse(evt: ParsedKey): Keybind.Info {
        return parse(evt)
      },
      match(key: keyof KeybindsConfig, evt: ParsedKey) {
        const keybind = userKeybinds()[key]
        if (!keybind) return false
        const parsed: Keybind.Info = result.parse(evt)
        for (const key of keybind) {
          if (Keybind.match(key, parsed)) {
            return true
          }
        }
      },
      print(key: keyof KeybindsConfig) {
        const first = userKeybinds()[key]?.at(0)
        if (!first) return ""
        const result = Keybind.toString(first)
        return result.replace("<leader>", Keybind.toString(userKeybinds().leader![0]!))
      },
      get keybinds() {
        return keybinds()
      },
    }

    return result
  },
})
