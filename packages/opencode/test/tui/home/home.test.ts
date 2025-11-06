const utils = setUpCommonHooksAndUtils()
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
  setSystemTime,
} from "bun:test"
import {
  createStubFiles,
  mockProviders,
  setUpCommonHooksAndUtils,
  setUpProviderMocking,
  SIZES,
} from "../fixture"
import { testRenderTui } from "../fixture_.tsx"
import { createGlobalEmitter } from "@solid-primitives/event-bus"
import { command } from "yargs"

describe("Home", () => {
  let s: Awaited<ReturnType<typeof utils.createIsolatedServer>>
  beforeAll(async () => {
    s = await utils.createIsolatedServer()
    setSystemTime(new Date("2025-01-01T00:00:00.000Z"))
  })

  test("should render correctly", async () => {
    utils.testSetup = await testRenderTui({ url: s.url }, SIZES.MEDIUM)
    await utils.renderOnceExpectMatchSnapshot()
  })

  test("should resize correctly", async () => {
    utils.testSetup = await testRenderTui({ url: s.url }, SIZES.NORMAL)
    await utils.testSetup.renderOnce()
    utils.testSetup.resize(SIZES.SMALL.width, SIZES.SMALL.height)
    await utils.renderOnceExpectMatchSnapshot()
  })

  // FIXME: Set up better mocks so it actually displays a message
  test.failing("prompt should start a new session", async () => {
    utils.testSetup = await testRenderTui({ url: s.url }, SIZES.MEDIUM)
    await utils.testSetup.mockInput.typeText("Hello, world!")
    await utils.testSetup.mockInput.pressEnter()
    await utils.sleep(3000)

    await utils.renderOnceExpectMatchSnapshot()
  })

  describe("Toast", () => {
    test("should render correctly", async () => {
      utils.testSetup = await testRenderTui({ url: s.url }, SIZES.SMALL)
      await s.client.tui.showToast({
        body: {
          variant: "info",
          message: "This is a toast message",
          duration: 500,
        },
        throwOnError: true,
      })
      await utils.sleep(100)
      await utils.renderOnceExpectMatchSnapshot()
    })

    test("should clear after timeout", async () => {
      utils.testSetup = await testRenderTui({ url: s.url }, SIZES.SMALL)
      await s.client.tui.showToast({
        body: {
          variant: "error",
          message: "This is a toast message",
          duration: 500,
          title: "Toast Title",
        },
        throwOnError: true,
      })
      await utils.sleep(400)
      await utils.renderOnceExpectMatchSnapshot()

      await utils.sleep(200)
      await utils.renderOnceExpectMatchSnapshot()
    })
  })

  describe("Prompt", () => {
    describe("! mode", () => {
      test("! should open shell mode", async () => {
        utils.testSetup = await testRenderTui({ url: s.url }, SIZES.SMALL)
        await utils.testSetup.mockInput.typeText("!")
        await utils.renderOnceExpectMatchSnapshot()
      })
      test.failing("esc should revert to normal mode", async () => {
        utils.testSetup = await testRenderTui(SIZES.SMALL)
        await utils.testSetup.mockInput.typeText("!test")
        await utils.testSetup.mockInput.pressEscape()
        await utils.sleep(50)
        await utils.renderOnceExpectMatchSnapshot()
      })
      test("backspace should revert to normal mode", async () => {
        utils.testSetup = await testRenderTui({ url: s.url }, SIZES.SMALL)
        await utils.testSetup.mockInput.typeText("!a")
        await utils.testSetup.mockInput.pressBackspace()
        await utils.testSetup.mockInput.pressBackspace()
        await utils.sleep(50)
        await utils.renderOnceExpectMatchSnapshot()
      })
    })

    describe("Autocomplete", () => {
      let cleanup: Awaited<ReturnType<typeof createStubFiles>>
      const waitForOpen = () => utils.sleep(200)
      beforeEach(async () => {
        cleanup = await createStubFiles({
          command: [
            {
              name: "e",
              description: "Short command",
              content: "blah blah",
            },
            {
              name: "long-command",
              description: "Long command",
              content: "blah blah",
            }
          ],
          misc: {
            "./files/1.txt": "Content of file 1",
            "./files/2.txt": "Content of file 2",
          }
        })
      })
      afterEach(async () => {
        await cleanup[Symbol.asyncDispose]()
      })

      describe("/ mode", () => {
        test("/ should open autocomplete", async () => {
          utils.testSetup = await testRenderTui({ url: s.url }, SIZES.SMALL)
          await utils.testSetup.renderOnce()
          await utils.testSetup.mockInput.typeText("/")
          await waitForOpen()
          await utils.renderOnceExpectMatchSnapshot()
        })

        test("should not open in the middle of text", async () => {
          utils.testSetup = await testRenderTui({ url: s.url }, SIZES.SMALL)
          await utils.testSetup.mockInput.typeText("blah /")
          await waitForOpen()
          await utils.renderOnceExpectMatchSnapshot()
        })

        test.only("should narrow /ex input to /exit", async () => {
          utils.testSetup = await testRenderTui({ url: s.url }, SIZES.SMALL)
          await utils.testSetup.renderOnce()
          await utils.testSetup.mockInput.typeText("/ex")
          await waitForOpen()
          await utils.renderOnceExpectMatchSnapshot()
        })

        test("enter should trigger action", async () => {
          const onExit = mock(async () => { })
          utils.testSetup = await testRenderTui({ url: s.url, onExit }, SIZES.SMALL)
          await utils.testSetup.renderOnce()
          await utils.testSetup.mockInput.typeText("/ex")
          await utils.testSetup.mockInput.pressEnter()
          expect(onExit).toHaveBeenCalled()
        })

        test.only("enter on custom command should expect args", async () => {
          utils.testSetup = await testRenderTui({ url: s.url }, SIZES.SMALL)
          await utils.testSetup.renderOnce()
          await utils.testSetup.mockInput.typeText("/long-c")
          await utils.testSetup.mockInput.pressEnter()
          await utils.testSetup.mockInput.typeText("arg1 arg2")
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
          await utils.sleep(50)
          await utils.renderOnceExpectMatchSnapshot()
        })

        test("tab should confirm choice", async () => {
          utils.testSetup = await testRenderTui(SIZES.SMALL)
          await utils.testSetup.mockInput.typeText("@nonexfile1")
          await utils.testSetup.mockInput.pressTab()
          await utils.sleep(50)
          await utils.renderOnceExpectMatchSnapshot()
        })

        test("esc should close", async () => {
          utils.testSetup = await testRenderTui(SIZES.SMALL)
          await utils.testSetup.renderOnce()
          await utils.testSetup.mockInput.typeText("@nonexfile1")
          await utils.testSetup.mockInput.pressEscape()
          await utils.sleep(50)
          await utils.renderOnceExpectMatchSnapshot()
        })

        test("clearing input should close", async () => {
          utils.testSetup = await testRenderTui(SIZES.SMALL)
          await utils.testSetup.renderOnce()
          await utils.testSetup.mockInput.typeText("blah @nonexfile1")
          await Promise.all(Array(11).fill(null).map(utils.testSetup.mockInput.pressBackspace))
          await utils.sleep(50)
          await utils.renderOnceExpectMatchSnapshot()
        })

        // TODO: Ask to make sure this is desired behavior
        test.todo("space should close", async () => { })

        test.todo("should honor input_submit binding", async () => { })
      })
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
