import type { TestRendererOptions } from "@opentui/core/testing"
import { testRender } from "@opentui/solid"

export async function testRenderTui(options?: TestRendererOptions) {
  const { Tui } = await import("@/cli/cmd/tui/app")
  return testRender(
    () => <Tui url="mock" mode="dark" onExit={Promise.resolve} />,
    options,
  )
}
