import { useRenderer } from "@opentui/solid"
import { createSimpleContext } from "./helper"

export const { use: useExit, provider: ExitProvider } = createSimpleContext({
  name: "Exit",
  init: (input: { onExit?: () => Promise<void> }) => {
    const renderer = useRenderer()
    return async () => {
      await setImmediate(() => renderer.destroy())
      await input.onExit?.()
    }
  },
})
