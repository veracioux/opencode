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
  setUpCommonHooks,
  setUpProviderMocking,
  SIZES,
  type MockConfig,
} from "../fixture"
import { testRenderTui } from "../fixture_.tsx"
import { mockIdentifiers } from "../../fixture/fixture.ts"
import { createGlobalEmitter } from "@solid-primitives/event-bus"

const ns = setUpCommonHooks()

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
    ns.testSetup = await testRenderTui(SIZES.MEDIUM)
    await ns.testSetup.renderOnce()
    const frame = ns.testSetup.captureCharFrame()
    expect(frame).toMatchSnapshot()
  })

  test("should resize correctly", async () => {
    ns.testSetup = await testRenderTui(SIZES.NORMAL)
    await ns.testSetup.renderOnce()
    ns.testSetup.resize(SIZES.SMALL.width, SIZES.SMALL.height)
    await ns.testSetup.renderOnce()
    const frame = ns.testSetup.captureCharFrame()
    expect(frame).toMatchSnapshot()
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

    ns.testSetup = await testRenderTui(SIZES.MEDIUM)
    await ns.testSetup.renderOnce()
    await ns.testSetup.mockInput.typeText("Hello, world!")
    await ns.testSetup.mockInput.pressEnter()
    await ns.testSetup.renderOnce()

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
    await ns.testSetup.renderOnce()

    const frame = ns.testSetup.captureCharFrame()
    expect(frame).toMatchSnapshot()
  })

  describe("Toast", () => {
    test("should render correctly", async () => {
      const mocks = await mockProviders({
        useSDK: (draft) => ({
          ...draft,
          event: createGlobalEmitter(),
        }),
      })
      ns.testSetup = await testRenderTui(SIZES.SMALL)
      mocks.useSDK.event.emit("tui.toast.show", {
        type: "tui.toast.show",
        properties: {
          variant: "info",
          message: "This is a toast message",
          duration: 100,
        },
      })

      await ns.testSetup.renderOnce()
      const frame = ns.testSetup.captureCharFrame()
      expect(frame).toMatchSnapshot()
    })

    test("should render correctly with title", async () => {
      const mocks = await mockProviders({
        useSDK: (draft) => ({
          ...draft,
          event: createGlobalEmitter(),
        }),
      })
      ns.testSetup = await testRenderTui(SIZES.SMALL)
      mocks.useSDK.event.emit("tui.toast.show", {
        type: "tui.toast.show",
        properties: {
          variant: "info",
          message: "This is a toast message",
          title: "Toast Title",
          duration: 100,
        },
      })

      await ns.testSetup.renderOnce()
      const frame = ns.testSetup.captureCharFrame()
      expect(frame).toMatchSnapshot()
    })

    test("should clear after timeout", async () => {
      const mocks = await mockProviders({
        useSDK: (draft) => ({
          ...draft,
          event: createGlobalEmitter(),
        }),
      })
      ns.testSetup = await testRenderTui(SIZES.SMALL)
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

      await ns.testSetup.renderOnce()
      const frame = ns.testSetup.captureCharFrame()
      expect(frame).toMatchSnapshot()
    })
  })

  describe("Prompt", () => {
    describe("! mode", () => {
      test("! should open shell mode", async () => {
        ns.testSetup = await testRenderTui(SIZES.SMALL)
        await ns.testSetup.mockInput.typeText("!")
        await ns.testSetup.renderOnce()
        await new Promise((r) => setTimeout(r, 50))
        const frame = ns.testSetup.captureCharFrame()
        expect(frame).toMatchSnapshot()
      })
      test("esc should revert to normal mode", async () => {
        ns.testSetup = await testRenderTui(SIZES.SMALL)
        await ns.testSetup.mockInput.typeText("!test")
        await ns.testSetup.renderOnce()
        await ns.testSetup.mockInput.pressEscape()
        await new Promise((r) => setTimeout(r, 50))
        const frame = ns.testSetup.captureCharFrame()
        expect(frame).toMatchSnapshot()
      })
      test("backspace should revert to normal mode", async () => {
        ns.testSetup = await testRenderTui(SIZES.SMALL)
        await ns.testSetup.mockInput.typeText("!a")
        await ns.testSetup.mockInput.pressBackspace()
        await ns.testSetup.mockInput.pressBackspace()
        await new Promise((r) => setTimeout(r, 50))
        await ns.testSetup.renderOnce()
        const frame = ns.testSetup.captureCharFrame()
        expect(frame).toMatchSnapshot()
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
          ns.testSetup = await testRenderTui(SIZES.SMALL)
          await ns.testSetup.renderOnce()
          await ns.testSetup.mockInput.typeText("/")
          await ns.testSetup.renderOnce()
          const frame = ns.testSetup.captureCharFrame()
          expect(frame).toMatchSnapshot()
        })

        test("should narrow /ex input to /exit", async () => {
          ns.testSetup = await testRenderTui(SIZES.SMALL)
          await ns.testSetup.renderOnce()
          await ns.testSetup.mockInput.typeText("/ex")
          await ns.testSetup.renderOnce()
          const frame = ns.testSetup.captureCharFrame()
          expect(frame).toMatchSnapshot()
        })

        test("enter should trigger action", async () => {
          const mocks = await mockProviders({})
          ns.testSetup = await testRenderTui(SIZES.SMALL)
          await ns.testSetup.renderOnce()
          await ns.testSetup.mockInput.typeText("/ex")
          await ns.testSetup.mockInput.pressEnter()
          await ns.testSetup.renderOnce()
          expect(mocks.useExit).toHaveBeenCalled()

          const frame = ns.testSetup.captureCharFrame()
          expect(frame).toMatchSnapshot()
        })

        // Behavior to be implemented, PR is open
        test.todo("/ exact matches should be prioritized", async () => {
          ns.testSetup = await testRenderTui(SIZES.SMALL)
          await ns.testSetup.renderOnce()
          await ns.testSetup.mockInput.typeText("/e")
          await ns.testSetup.renderOnce()
          const frame = ns.testSetup.captureCharFrame()
          expect(frame).toMatchSnapshot()
        })
      })

      describe("@ mode", () => {
        test("@ should open autocomplete", async () => {
          ns.testSetup = await testRenderTui(SIZES.SMALL)
          await ns.testSetup.renderOnce()
          await ns.testSetup.mockInput.typeText("@")
          await ns.testSetup.renderOnce()
          const frame = ns.testSetup.captureCharFrame()
          expect(frame).toMatchSnapshot()
        })

        test("should match items correctly", async () => {
          ns.testSetup = await testRenderTui(SIZES.SMALL)
          await ns.testSetup.renderOnce()
          await ns.testSetup.mockInput.typeText("@nonexfile1")
          await ns.testSetup.renderOnce()
          const frame = ns.testSetup.captureCharFrame()
          expect(frame).toMatchSnapshot()
        })

        test("should trigger in the middle of text", async () => {
          ns.testSetup = await testRenderTui(SIZES.SMALL)
          await ns.testSetup.renderOnce()
          await ns.testSetup.mockInput.typeText("blah @nonexfile1")
          await ns.testSetup.renderOnce()
          expect(ns.testSetup.captureCharFrame()).toMatchSnapshot()
        })

        test("enter should confirm choice", async () => {
          ns.testSetup = await testRenderTui(SIZES.SMALL)
          await ns.testSetup.mockInput.typeText("@nonexfile1")
          await ns.testSetup.mockInput.pressEnter()
          await new Promise((r) => setTimeout(r, 50))
          await ns.testSetup.renderOnce()
          const frame = ns.testSetup.captureCharFrame()
          expect(frame).toMatchSnapshot()
        })

        test("tab should confirm choice", async () => {
          ns.testSetup = await testRenderTui(SIZES.SMALL)
          await ns.testSetup.mockInput.typeText("@nonexfile1")
          await ns.testSetup.mockInput.pressTab()
          await new Promise((r) => setTimeout(r, 50))
          await ns.testSetup.renderOnce()
          const frame = ns.testSetup.captureCharFrame()
          expect(frame).toMatchSnapshot()
        })

        test("esc should close", async () => {
          ns.testSetup = await testRenderTui(SIZES.SMALL)
          await ns.testSetup.renderOnce()
          await ns.testSetup.mockInput.typeText("@nonexfile1")
          await ns.testSetup.mockInput.pressEscape()
          await new Promise((r) => setTimeout(r, 50))
          await ns.testSetup.renderOnce()
          const frame = ns.testSetup.captureCharFrame()
          expect(frame).toMatchSnapshot()
        })

        test("clearing input should close", async () => {
          ns.testSetup = await testRenderTui(SIZES.SMALL)
          await ns.testSetup.renderOnce()
          await ns.testSetup.mockInput.typeText("blah @nonexfile1")
          await Promise.all(Array(11).fill(null).map(ns.testSetup.mockInput.pressBackspace))
          await new Promise((r) => setTimeout(r, 50))
          await ns.testSetup.renderOnce()
          const frame = ns.testSetup.captureCharFrame()
          expect(frame).toMatchSnapshot()
        })

        // TODO: Ask to make sure this is desired behavior
        test.todo("space should close", async () => {})

        test.todo("should honor input_submit binding", async () => {})
      })
    })
  })

  describe("Model dialog", () => {
    test("should open model dialog", async () => {
      ns.testSetup = await testRenderTui({ ...SIZES.MEDIUM, ...SIZES.TALL })
      ns.testSetup.mockInput.pressKey("x", { ctrl: true })
      ns.testSetup.mockInput.pressKey("m")
      await ns.testSetup.renderOnce()
      const frame = ns.testSetup.captureCharFrame()
      expect(frame).toMatchSnapshot()
    })
  })

  describe("Agent cycling", () => {
    test("tab should switch agent, with wrap-around", async () => {
      ns.testSetup = await testRenderTui(SIZES.SMALL)
      await ns.testSetup.renderOnce()
      await ns.testSetup.mockInput.typeText("blah blah") // have some initial input
      await ns.testSetup.mockInput.pressTab()
      await ns.testSetup.renderOnce()
      expect(ns.testSetup.captureCharFrame()).toMatchSnapshot()

      await ns.testSetup.mockInput.pressTab()
      await ns.testSetup.renderOnce()
      expect(ns.testSetup.captureCharFrame()).toMatchSnapshot()

      await ns.testSetup.mockInput.pressTab()
      await ns.testSetup.renderOnce()
      expect(ns.testSetup.captureCharFrame()).toMatchSnapshot()

      await ns.testSetup.renderOnce()
    })
    test("backtab should switch agent in reverse, with wrap-around", async () => {
      // const mocks = await mockProviders()
      ns.testSetup = await testRenderTui(SIZES.SMALL)
      await ns.testSetup.renderOnce()
      await ns.testSetup.mockInput.typeText("blah blah") // have some initial input
      // FIXME: opentui bug: following doesn't work
      // await ns.testSetup.mockInput.pressTab({ shift: true })
      // Workaround:
      function pressBacktab() {
        return ns.testSetup!.mockInput.pressKey("\x1b[Z")
      }

      await pressBacktab()
      await ns.testSetup.renderOnce()
      expect(ns.testSetup.captureCharFrame()).toMatchSnapshot()

      await pressBacktab()
      await ns.testSetup.renderOnce()
      expect(ns.testSetup.captureCharFrame()).toMatchSnapshot()
    })
  })
})
