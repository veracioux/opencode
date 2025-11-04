await setUpProviderMocking()

import { afterEach, beforeEach, describe, expect, test, } from "bun:test"
import { mockProviders, setUpCommonHooks, setUpProviderMocking, type MockConfig } from "./fixture"
import { testRenderTui } from "./fixture_.tsx"

const ns = setUpCommonHooks()

describe("Session", async () => {
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
  })

  test("should render correctly", async () => {
    await mockProviders({
      useRoute: (draft) => ({
        ...draft,
        data: {
          type: "session",
          sessionID: "ses_1",
        }
      }),
      useSync: (draft) => ({
        ...draft,
        session: {
          ...draft.session,
          get() {
            return {
              id: "ses_1",
            }
          }
        },
        data: {
          ...draft.data,
          message: {
            "ses_1": [
              {
                id: "msg_1",
                role: "user",
                sessionID: "ses_1",
                time: { created: Date.parse("2025-01-01T00:00:00Z") }
              }
            ]
          },
          part: {
            "msg_1": [
              {
                type: "text",
                messageID: "msg_1",
                text: "Hello, world!",
              }
            ]
          }
        }
      } as any),
    })

    ns.testSetup = await testRenderTui({
      width: 90,
      height: 25,
    })

    await ns.testSetup.renderOnce()

    await new Promise((r) => setTimeout(r, 1000))

    await ns.testSetup.renderOnce()

    const frame = ns.testSetup.captureCharFrame()

    expect(frame).toMatchSnapshot()
  })
})
