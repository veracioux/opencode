import { useDialog } from "@tui/ui/dialog"
import { DialogSelect, type DialogSelectOption } from "@tui/ui/dialog-select"
import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  useContext,
  type Accessor,
  type ParentProps,
} from "solid-js"
import { useKeybind } from "@tui/context/keybind"
import type { KeybindsConfig } from "@opencode-ai/sdk"

type Context = ReturnType<typeof init>
const ctx = createContext<Context>()

export type CommandOption = DialogSelectOption & {
  keybind?: keyof KeybindsConfig
}

function init() {
  const [registrations, setRegistrations] = createSignal<Accessor<CommandOption[]>[]>([])
  const [suspendCount, setSuspendCount] = createSignal(0)
  const dialog = useDialog()
  const keybind = useKeybind()
  const options = createMemo(() => {
    return registrations().flatMap((x) => x())
  })
  const suspended = () => suspendCount() > 0

  createEffect(() => {
    if (suspended()) return
    for (const option of options()) {
      if (option.keybind) {
        keybind.keybinds.global[option.keybind]?.setHandler(() => {
          option.onSelect?.(dialog)
        })
      }
    }
  })

  const result = {
    trigger(name: string, source?: "prompt") {
      for (const option of options()) {
        if (option.value === name) {
          option.onSelect?.(dialog, source)
          return
        }
      }
    },
    keybinds(enabled: boolean) {
      setSuspendCount((count) => count + (enabled ? -1 : 1))
    },
    suspended,
    show() {
      dialog.replace(() => <DialogCommand options={options()} />)
    },
    register(cb: () => CommandOption[]) {
      const results = createMemo(cb)
      setRegistrations((arr) => [results, ...arr])
      onCleanup(() => {
        setRegistrations((arr) => arr.filter((x) => x !== results))
      })
    },
    get options() {
      return options()
    },
  }
  return result
}

export function useCommandDialog() {
  const value = useContext(ctx)
  if (!value) {
    throw new Error("useCommandDialog must be used within a CommandProvider")
  }
  return value
}

export function CommandProvider(props: ParentProps) {
  const value = init()
  const dialog = useDialog()

  value.register(() => [
    {
      title: "Show commands",
      disabled: true,
      value: "command_list",
      onSelect: () => {
        dialog.replace(() => <DialogCommand options={value.options} />)
      },
      keybind: "command_list",
    }
  ])

  return <ctx.Provider value={value}>{props.children}</ctx.Provider>
}

function DialogCommand(props: { options: CommandOption[] }) {
  const keybind = useKeybind()
  return (
    <DialogSelect
      title="Commands"
      options={props.options.map((x) => ({
        ...x,
        footer: x.keybind ? keybind.print(x.keybind) : undefined,
      }))}
    />
  )
}
