import type { TestRendererOptions } from "@opentui/core/testing"
import { testRender } from "@opentui/solid"

export async function testRenderTui(options?: TestRendererOptions & { url?: string }, sizeMixin?: { width?: number; height?: number }) {
  const { Tui } = await import("@/cli/cmd/tui/app")
  const { url, ...rest } = options ?? {}
  const result = await testRender(
    () => <Tui url={url ?? "mock"} mode="dark" onExit={Promise.resolve} />,
    {
      ...rest,
      ...(sizeMixin ?? {}),
    },
  )
  // allow some time for initial sync with server
  if (options?.url) {
    await new Promise((r) => setTimeout(r, 500))
  }
  return result
}
