import type { TestRendererOptions } from "@opentui/core/testing"
import { testRender } from "@opentui/solid"

export async function testRenderTui(options?: TestRendererOptions & { url?: string, onExit?: () => Promise<void> }, sizeMixin?: { width?: number; height?: number }) {
  const { Tui } = await import("@/cli/cmd/tui/app")
  const { url, onExit, ...rest } = options ?? {}
  const result = await testRender(
    () => <Tui url={url ?? "mock"} mode="dark" onExit={onExit ?? Promise.reject} />,
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
