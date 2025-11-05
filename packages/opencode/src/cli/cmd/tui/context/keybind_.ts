import { Keybind } from "@/util/keybind"
import { useKeyboard } from "@opentui/solid"
import type { KeyEvent } from "@opentui/core"
import { onCleanup } from "solid-js"

export const PRIORITY = {
  NORMAL: 0,
  COMMAND_LIST: 1,
  DIALOG: 2,
}

export abstract class KeybindRegistration {
  combos: string[]
  constructor(combos: string | string[], public priority: number = PRIORITY.NORMAL) {
    this.combos = Array.isArray(combos) ? combos : [combos]
  }
  abstract print(): string
  abstract setHandler(cb: KeybindCallback): void
}

export type KeybindCallback = () => Promise<void | boolean> | void | boolean

export function state(parse: (evt: KeyEvent) => Keybind.Info, leader: () => Keybind.Info) {
  class _KeybindRegistration extends KeybindRegistration {
    setHandler(cb: KeybindCallback) {
      listeners.set(this, cb)
      onCleanup(() => {
        listeners.delete(this)
      })
    }
    print() {
      return this.combos.map(combo =>
        combo
          .replace("<leader>", Keybind.toString(leader()))
          .replace("escape", "esc")
          .replace("return", "enter")
        ).join("/")
    }
  }

  const listeners = new Map<KeybindRegistration, KeybindCallback>()
  let partialKeyCombo: Keybind.Info[] = []

  function compareKeyCombos(partialCombo: Keybind.Info[], fullCombo: Keybind.Info[]): "mismatch" | "match" | "prefix" {
    if (partialCombo.length > fullCombo.length) return "mismatch"
    for (let i = 0; i < partialCombo.length; i++) {
      if (!Keybind.match(partialCombo[i], fullCombo[i])) {
        return i > 0 ? "prefix" : "mismatch"
      }
    }
    return "match"
  }

  useKeyboard(async (evt) => {
    if (!evt.name) return

    const parsed = { ...parse(evt) }
    for (const [keybindRegistration, cb] of [...listeners.entries()].reverse().sort(
      ([a], [b]) => -(a.priority - b.priority),
    )) {
      for (const binding of keybindRegistration.combos) {
        partialKeyCombo = [...partialKeyCombo, parsed]
        const listenedForCombo = Keybind.parse(binding)
        const comparison = compareKeyCombos(partialKeyCombo, listenedForCombo)
        if (comparison === "match") {
          partialKeyCombo = []
          const result = await cb()
          // if (result === true || result === undefined) {
            evt.preventDefault()
            return
          // }
        } else if (comparison === "mismatch") {
          partialKeyCombo = []
        }
      }
    }
  })

  return _KeybindRegistration
}
