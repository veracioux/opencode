import type { TestRendererOptions } from "@opentui/core/testing"
import { testRender } from "@opentui/solid"
import { test } from "bun:test"

export async function testRenderTui(options?: TestRendererOptions & { url?: string }, sizeMixin?: { width?: number; height?: number }) {
  const { Tui } = await import("@/cli/cmd/tui/app")
  const result = await testRender(
    () => <Tui url={options?.url ?? "mock"} mode="dark" onExit={Promise.resolve} />,
    {
      ...options,
      ...(sizeMixin ?? {}),
    },
  )
  // allow some time for initial sync with server
  if (options?.url) {
    await new Promise((r) => setTimeout(r, 500))
  }
  return result
}
