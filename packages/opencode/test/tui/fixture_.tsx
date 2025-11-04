import type { TestRendererOptions } from "@opentui/core/testing"
import { testRender } from "@opentui/solid"
import { test } from "bun:test"

export async function testRenderTui(options?: TestRendererOptions & { url?: string }, sizeMixin?: { width?: number; height?: number }) {
  const { Tui } = await import("@/cli/cmd/tui/app")
  return await testRender(
    () => <Tui url={options?.url ?? "mock"} mode="dark" onExit={Promise.resolve} />,
    {
      ...options,
      ...(sizeMixin ?? {}),
    },
  )
}
