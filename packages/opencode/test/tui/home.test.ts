await setUpProviderMocking()

import { test, expect, describe, beforeAll, beforeEach, mock, afterEach, xtest, spyOn, type Mock, xdescribe } from "bun:test"
import os from "os"
import { mockProviders, setUpProviderMocking, type MockConfig, type RecursivePartial } from "./fixture"
import fs from "fs/promises"
import path from "path"
import { testRenderTui } from "./fixture_.tsx"
import type { OpencodeClient } from "@opencode-ai/sdk"
import { mockIdentifiers } from "../fixture/fixture.ts"

let testSetup: Awaited<ReturnType<typeof testRenderTui>> | undefined = undefined

describe("Home", () => {
  let tmpdir: string
  let homedir: string
  beforeAll(async () => {
    tmpdir = os.tmpdir()
    process.chdir(tmpdir)
  })

  beforeEach(async () => {
    await mockProviders({
      useTheme: true,
      useKV: true,
      useSDK: true,
      useSync: true,
      useExit: true,
      usePromptHistory: true,
      useLocal: false,
      useToast: false,
      useRoute: false,
      useDialog: false,
      useCommandDialog: false,
      useKeybind: false,
    } satisfies Required<MockConfig>)
    homedir = await fs.mkdtemp(tmpdir + path.sep)
    process.env.HOME = homedir
    if (testSetup) await testSetup.renderer.destroy()
  })

  afterEach(async () => {
    mock.restore()
    await fs.rmdir(homedir)
    if (testSetup) await testSetup.renderer.destroy()
  })

  test("should render correctly", async () => {
    testSetup = await testRenderTui({
      width: 80,
      height: 25,
    })
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    expect(frame).toMatchSnapshot()
  })

  test("should resize correctly", async () => {
    testSetup = await testRenderTui({
      width: 100,
      height: 30,
    })
    await testSetup.renderOnce()
    testSetup.resize(60, 20)
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    expect(frame).toMatchSnapshot()
  })

  test("prompt should start a new session", async () => {

    const mocks = await mockProviders({
      useSDK: (draft) => ({
        ...draft,
        client: {
          session: {
            ...draft.client.session,
            create: mock(async (_) => ({ data: { id: "ses_1" } })),
            prompt: mock(async (_) => ({ data: {} })),
          },
        } as RecursivePartial<OpencodeClient> as OpencodeClient,
      }),
      useSync: (draft) => ({
        ...draft,
        data: {
          ...draft.data,
          message: {
            "ses_1": [
              {
                id: "message_1",
                sessionID: "ses_1",
                role: "user",
                time: {
                  created: Date.parse("Nov 3, 2025 18:00")
                },
                summary: {
                  body: "Hello, world!"
                },
              }
            ],
          }
        },
        session: {
          ...draft.session,
          sync: mock(() => Promise.resolve()),
          get: mock(() => ({ id: "ses_1" } as any)),
        },
      })
    })

    await mockIdentifiers()
    testSetup = await testRenderTui({
      width: 80,
      height: 25,
    })
    await testSetup.renderOnce()
    await testSetup.mockInput.typeText("Hello, world!")
    await testSetup.mockInput.pressEnter()
    await testSetup.renderOnce()

    expect(mocks.useSDK.client.session.create).toHaveBeenCalledWith({})
    expect(mocks.useSDK.client.session.prompt).toHaveBeenCalledWith({
      "body": {
        "agent": "mock-agent-1",
        "messageID": "message_1",
        "model": {
          "modelID": "mock-model-1",
          "providerID": "mock-provider-1",
        },
        "modelID": "mock-model-1",
        "parts": [
          {
            "id": "part_1",
            "text": "Hello, world!",
            "type": "text",
          },
        ],
        "providerID": "mock-provider-1",
      },
      "path": {
        "id": "ses_1",
      },
    })
    await new Promise((r) => setTimeout(r, 2000)) // wait for tui to update
    await testSetup.renderOnce()

    const frame = testSetup.captureCharFrame()
    expect(frame).toMatchSnapshot("asdf")
  })

  describe("Model dialog", () => {
    test("should open model dialog", async () => {
      testSetup = await testRenderTui({
        width: 80,
        height: 28,
      })
      await testSetup.renderOnce()
      testSetup.mockInput.pressKey("x", { ctrl: true })
      testSetup.mockInput.pressKey("m")
      await testSetup.renderOnce()
      const frame = testSetup.captureCharFrame()
      expect(frame).toMatchSnapshot()
    })
  })
})
