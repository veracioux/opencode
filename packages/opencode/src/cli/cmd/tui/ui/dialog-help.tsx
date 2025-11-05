import { TextAttributes } from "@opentui/core"
import { useTheme } from "@tui/context/theme"
import { useDialog } from "./dialog"
import { onMount } from "solid-js"
import { useKeybind } from "../context/keybind"

export function DialogHelp() {
  const dialog = useDialog()
  const { theme } = useTheme()
  const keybind = useKeybind()

  onMount(() => {
    keybind.keybinds.dialog.help.close.setHandler(() => dialog.clear())
  })

  return (
    <box paddingLeft={2} paddingRight={2} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD}>Help</text>
        <text fg={theme.textMuted}>{keybind.keybinds.dialog.help.close.print()}</text>
      </box>
      <box paddingBottom={1}>
        {/* Replace Ctrl+P with expression */}
        <text fg={theme.textMuted}>
          Press Ctrl+P to see all available actions and commands in any context.
        </text>
      </box>
      <box flexDirection="row" justifyContent="flex-end" paddingBottom={1}>
        <box
          paddingLeft={3}
          paddingRight={3}
          backgroundColor={theme.primary}
          onMouseUp={() => dialog.clear()}
        >
          <text fg={theme.background}>ok</text>
        </box>
      </box>
    </box>
  )
}
