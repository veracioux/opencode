import type { TestRendererOptions } from "@opentui/core/testing"
import { testRender } from "@opentui/solid"

export async function testRenderTui(options?: TestRendererOptions & { url?: string }) {
  const { Tui } = await import("@/cli/cmd/tui/app")
  return await testRender(
    () => <Tui url={options?.url ?? "mock"} mode="dark" onExit={Promise.resolve} />,
    options,
  )
}
