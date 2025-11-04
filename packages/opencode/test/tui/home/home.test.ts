await setUpProviderMocking()

import {
  test,
  expect,
  describe,
  beforeAll,
  beforeEach,
  mock,
  afterEach,
  xtest,
  spyOn,
  type Mock,
  xdescribe,
} from "bun:test"
import {
  mockProviders,
  setUpCommonHooksAndUtils,
  setUpProviderMocking,
  SIZES,
  type MockConfig,
} from "../fixture"
import { testRenderTui } from "../fixture_.tsx"
import { mockIdentifiers } from "../../fixture/fixture.ts"
import { createGlobalEmitter } from "@solid-primitives/event-bus"

const utils = setUpCommonHooksAndUtils()

describe("Home", () => {
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
    utils.testSetup = await testRenderTui(SIZES.MEDIUM)
    await utils.renderOnceExpectMatchSnapshot()
  })

  test("should resize correctly", async () => {
    utils.testSetup = await testRenderTui(SIZES.NORMAL)
    await utils.testSetup.renderOnce()
    utils.testSetup.resize(SIZES.SMALL.width, SIZES.SMALL.height)
    await utils.renderOnceExpectMatchSnapshot()
  })

  // FIXME: Set up better mocks so it actually displays a message
  test("prompt should start a new session", async () => {
    const mocks = await mockProviders({
      useSDK: (draft) => ({
        ...draft,
        client: {
          ...draft.client,
          session: {
            ...draft.client.session,
            create: mock(async (_) => ({ data: { id: "ses_1" } })),
            prompt: mock(async (_) => ({ data: {} })),
          },
        } as any,
      }),
    })
    await mockIdentifiers()

    utils.testSetup = await testRenderTui(SIZES.MEDIUM)
    await utils.testSetup.mockInput.typeText("Hello, world!")
    await utils.testSetup.mockInput.pressEnter()
    await utils.testSetup.renderOnce()

    expect(mocks.useSDK.client.session.create).toHaveBeenCalledWith({})
    expect(mocks.useSDK.client.session.prompt).toHaveBeenCalledWith({
      body: {
        agent: "mock-agent-1",
        messageID: "message_1",
        model: {
          modelID: "mock-model-1",
          providerID: "mock-provider-1",
        },
        modelID: "mock-model-1",
        parts: [
          {
            id: "part_1",
            text: "Hello, world!",
            type: "text",
          },
        ],
        providerID: "mock-provider-1",
      },
      path: {
        id: "ses_1",
      },
    })
    await new Promise((r) => setTimeout(r, 300)) // wait for tui to update
    await utils.renderOnceExpectMatchSnapshot()
  })

  describe("Toast", () => {
    test("should render correctly", async () => {
      const mocks = await mockProviders({
        useSDK: (draft) => ({
          ...draft,
          event: createGlobalEmitter(),
        }),
      })
      utils.testSetup = await testRenderTui(SIZES.SMALL)
      mocks.useSDK.event.emit("tui.toast.show", {
        type: "tui.toast.show",
        properties: {
          variant: "info",
          message: "This is a toast message",
          duration: 100,
        },
      })

      await utils.renderOnceExpectMatchSnapshot()
    })

    test("should render correctly with title", async () => {
      const mocks = await mockProviders({
        useSDK: (draft) => ({
          ...draft,
          event: createGlobalEmitter(),
        }),
      })
      utils.testSetup = await testRenderTui(SIZES.SMALL)
      mocks.useSDK.event.emit("tui.toast.show", {
        type: "tui.toast.show",
        properties: {
          variant: "info",
          message: "This is a toast message",
          title: "Toast Title",
          duration: 100,
        },
      })

      await utils.renderOnceExpectMatchSnapshot()
    })

    test("should clear after timeout", async () => {
      const mocks = await mockProviders({
        useSDK: (draft) => ({
          ...draft,
          event: createGlobalEmitter(),
        }),
      })
      utils.testSetup = await testRenderTui(SIZES.SMALL)
      mocks.useSDK.event.emit("tui.toast.show", {
        type: "tui.toast.show",
        properties: {
          variant: "error",
          message: "This is a toast message",
          title: "Toast Title",
          duration: 100,
        },
      })

      await new Promise((r) => setTimeout(r, 150))

      await utils.renderOnceExpectMatchSnapshot()
    })
  })

  describe("Prompt", () => {
    describe("! mode", () => {
      test("! should open shell mode", async () => {
        utils.testSetup = await testRenderTui(SIZES.SMALL)
        await utils.testSetup.mockInput.typeText("!")
        await utils.renderOnceExpectMatchSnapshot()
      })
      test("esc should revert to normal mode", async () => {
        utils.testSetup = await testRenderTui(SIZES.SMALL)
        await utils.testSetup.mockInput.typeText("!test")
        await utils.testSetup.mockInput.pressEscape()
        await new Promise((r) => setTimeout(r, 50))
        await utils.renderOnceExpectMatchSnapshot()
      })
      test("backspace should revert to normal mode", async () => {
        utils.testSetup = await testRenderTui(SIZES.SMALL)
        await utils.testSetup.mockInput.typeText("!a")
        await utils.testSetup.mockInput.pressBackspace()
        await utils.testSetup.mockInput.pressBackspace()
        await new Promise((r) => setTimeout(r, 50))
        await utils.renderOnceExpectMatchSnapshot()
      })
    })

    describe("Autocomplete", () => {
      beforeEach(async () => {
        await mockProviders({
          useSDK: (draft) => ({
            ...draft,
            client: {
              ...draft.client,
              find: {
                ...draft.client.find,
                files() {
                  return {
                    data: ["/non/existent/file1.txt", "/non/existent/file2.txt"],
                  } as any
                },
              },
            },
          }),
          useSync: (draft) => ({
            ...draft,
            data: {
              ...draft.data,
              command: [
                ...draft.data.command,
                {
                  name: "e",
                  description: "Short command",
                },
                {
                  name: "long-command",
                  description: "Long command",
                },
              ],
            } as any,
          }),
        })
      })

      describe("/ mode", () => {
        test("/ should open autocomplete", async () => {
          utils.testSetup = await testRenderTui(SIZES.SMALL)
          await utils.testSetup.renderOnce()
          await utils.testSetup.mockInput.typeText("/")
          await utils.renderOnceExpectMatchSnapshot()
        })

        test("should not open in the middle of text", async () => {
          utils.testSetup = await testRenderTui(SIZES.SMALL)
          await utils.testSetup.mockInput.typeText("blah /")
          await new Promise((r) => setTimeout(r, 100))
          await utils.renderOnceExpectMatchSnapshot()
        })

        test("should narrow /ex input to /exit", async () => {
          utils.testSetup = await testRenderTui(SIZES.SMALL)
          await utils.testSetup.renderOnce()
          await utils.testSetup.mockInput.typeText("/ex")
          await utils.renderOnceExpectMatchSnapshot()
        })

        test("enter should trigger action", async () => {
          const mocks = await mockProviders()
          utils.testSetup = await testRenderTui(SIZES.SMALL)
          await utils.testSetup.renderOnce()
          await utils.testSetup.mockInput.typeText("/ex")
          await utils.testSetup.mockInput.pressEnter()
          await utils.renderOnceExpectMatchSnapshot()
          expect(mocks.useExit).toHaveBeenCalled()
        })

        test("enter on custom command should expect args", async () => {
          utils.testSetup = await testRenderTui(SIZES.SMALL)
          await utils.testSetup.renderOnce()
          await utils.testSetup.mockInput.typeText("/long-c")
          await utils.testSetup.mockInput.pressEnter()
          await utils.renderOnceExpectMatchSnapshot()
        })

        // Behavior to be implemented, PR is open
        test.todo("/ exact matches should be prioritized", async () => {
          utils.testSetup = await testRenderTui(SIZES.SMALL)
          await utils.testSetup.renderOnce()
          await utils.testSetup.mockInput.typeText("/e")
          await utils.testSetup.renderOnce()
          const frame = utils.testSetup.captureCharFrame()
          expect(frame).toMatchSnapshot()
        })
      })

      describe("@ mode", () => {
        test("@ should open autocomplete", async () => {
          utils.testSetup = await testRenderTui(SIZES.SMALL)
          await utils.testSetup.renderOnce()
          await utils.testSetup.mockInput.typeText("@")
          await utils.renderOnceExpectMatchSnapshot()
        })

        test("should match items correctly", async () => {
          utils.testSetup = await testRenderTui(SIZES.SMALL)
          await utils.testSetup.renderOnce()
          await utils.testSetup.mockInput.typeText("@nonexfile1")
          await utils.renderOnceExpectMatchSnapshot()
        })

        test("should trigger in the middle of text", async () => {
          utils.testSetup = await testRenderTui(SIZES.SMALL)
          await utils.testSetup.renderOnce()
          await utils.testSetup.mockInput.typeText("blah @nonexfile1")
          await utils.renderOnceExpectMatchSnapshot()
        })

        test("enter should confirm choice", async () => {
          utils.testSetup = await testRenderTui(SIZES.SMALL)
          await utils.testSetup.mockInput.typeText("@nonexfile1")
          await utils.testSetup.mockInput.pressEnter()
          await new Promise((r) => setTimeout(r, 50))
          await utils.renderOnceExpectMatchSnapshot()
        })

        test("tab should confirm choice", async () => {
          utils.testSetup = await testRenderTui(SIZES.SMALL)
          await utils.testSetup.mockInput.typeText("@nonexfile1")
          await utils.testSetup.mockInput.pressTab()
          await new Promise((r) => setTimeout(r, 50))
          await utils.renderOnceExpectMatchSnapshot()
        })

        test("esc should close", async () => {
          utils.testSetup = await testRenderTui(SIZES.SMALL)
          await utils.testSetup.renderOnce()
          await utils.testSetup.mockInput.typeText("@nonexfile1")
          await utils.testSetup.mockInput.pressEscape()
          await new Promise((r) => setTimeout(r, 50))
          await utils.renderOnceExpectMatchSnapshot()
        })

        test("clearing input should close", async () => {
          utils.testSetup = await testRenderTui(SIZES.SMALL)
          await utils.testSetup.renderOnce()
          await utils.testSetup.mockInput.typeText("blah @nonexfile1")
          await Promise.all(Array(11).fill(null).map(utils.testSetup.mockInput.pressBackspace))
          await new Promise((r) => setTimeout(r, 50))
          await utils.renderOnceExpectMatchSnapshot()
        })

        // TODO: Ask to make sure this is desired behavior
        test.todo("space should close", async () => {})

        test.todo("should honor input_submit binding", async () => {})
      })
    })
  })

  describe("Model dialog", () => {
    test("should open model dialog", async () => {
      utils.testSetup = await testRenderTui({ ...SIZES.MEDIUM, ...SIZES.TALL })
      utils.testSetup.mockInput.pressKey("x", { ctrl: true })
      utils.testSetup.mockInput.pressKey("m")
      await utils.renderOnceExpectMatchSnapshot()
    })
  })

  describe("Agent cycling", () => {
    test("tab should switch agent, with wrap-around", async () => {
      utils.testSetup = await testRenderTui(SIZES.SMALL)
      await utils.testSetup.renderOnce()
      await utils.testSetup.mockInput.typeText("blah blah") // have some initial input
      await utils.testSetup.mockInput.pressTab()
      await utils.renderOnceExpectMatchSnapshot()

      await utils.testSetup.mockInput.pressTab()
      await utils.renderOnceExpectMatchSnapshot()

      await utils.testSetup.mockInput.pressTab()
      await utils.renderOnceExpectMatchSnapshot()
    })
    test("backtab should switch agent in reverse, with wrap-around", async () => {
      // const mocks = await mockProviders()
      utils.testSetup = await testRenderTui(SIZES.SMALL)
      await utils.testSetup.renderOnce()
      await utils.testSetup.mockInput.typeText("blah blah") // have some initial input
      // FIXME: opentui bug: following doesn't work
      // await ns.testSetup.mockInput.pressTab({ shift: true })
      // Workaround:
      function pressBacktab() {
        return utils.testSetup!.mockInput.pressKey("\x1b[Z")
      }

      await pressBacktab()
      await utils.renderOnceExpectMatchSnapshot()

      await pressBacktab()
      await utils.renderOnceExpectMatchSnapshot()
    })
  })
})
