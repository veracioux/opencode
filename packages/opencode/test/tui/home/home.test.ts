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
  afterAll,
} from "bun:test"
import { createStubFiles, setUpCommonHooksAndUtils, setUpProviderMocking, SIZES } from "../fixture"
import { testRenderTui } from "../fixture_.tsx"
import { sleep } from "bun"

describe("Home", () => {
  let s: Awaited<ReturnType<typeof utils.createIsolatedServer>>
  beforeAll(async () => {
    s = await utils.createIsolatedServer()
    // Let the server boot up
    await utils.sleep(2500)
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

  // FIXME: Mock LLM response
  test.todo("prompt should start a new session", async () => {
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
          duration: 1000,
        },
        throwOnError: true,
      })
      await utils.sleep(300)
      await utils.renderOnceExpectMatchSnapshot()
    })

    test("should clear after timeout", async () => {
      await utils.sleep(1000)
      utils.testSetup = await testRenderTui({ url: s.url }, SIZES.SMALL)
      await utils.sleep(1000)
      await s.client.tui.showToast({
        body: {
          variant: "error",
          message: "This is a toast message",
          duration: 600,
          title: "Toast Title",
        },
        throwOnError: true,
      })
      await utils.sleep(300)
      await utils.renderOnceExpectMatchSnapshot()

      await utils.sleep(800)
      await utils.renderOnceExpectMatchSnapshot()
    })
  })

  describe("Prompt", () => {
    describe("! mode", () => {
      test("! should open shell mode", async () => {
        utils.testSetup = await testRenderTui({ url: s.url }, SIZES.SMALL)
        await utils.testSetup.mockInput.typeText("!")
        await utils.sleep(100)
        await utils.renderOnceExpectMatchSnapshot()
      })
      test.failing("esc should revert to normal mode", async () => {
        utils.testSetup = await testRenderTui({ url: s.url }, SIZES.SMALL)
        await utils.testSetup.mockInput.typeText("!test")
        await utils.testSetup.mockInput.pressEscape()
        await utils.sleep(100)
        await utils.renderOnceExpectMatchSnapshot()
      })
      test("backspace should revert to normal mode", async () => {
        utils.testSetup = await testRenderTui({ url: s.url }, SIZES.SMALL)
        await utils.testSetup.mockInput.typeText("!a")
        await utils.testSetup.mockInput.pressBackspace()
        await utils.testSetup.mockInput.pressBackspace()
        await utils.sleep(100)
        await utils.renderOnceExpectMatchSnapshot()
      })
    })
  })

  describe("Agent cycling", () => {
    let cleanup: Awaited<ReturnType<typeof createStubFiles>>
    beforeEach(async () => {
      cleanup = await createStubFiles({})
    })
    afterEach(async () => {
      await cleanup[Symbol.asyncDispose]()
    })

    test("tab should switch agent, with wrap-around", async () => {
      utils.testSetup = await testRenderTui({ url: s.url }, SIZES.SMALL)
      await utils.testSetup.renderOnce()
      await utils.testSetup.mockInput.typeText("blah blah") // have some initial input
      await sleep(100)

      await utils.testSetup.mockInput.pressTab()
      await sleep(100)
      await utils.renderOnceExpectMatchSnapshot()

      await utils.testSetup.mockInput.pressTab()
      await sleep(100)
      await utils.renderOnceExpectMatchSnapshot()

      await utils.testSetup.mockInput.pressTab()
      await sleep(100)
      await utils.renderOnceExpectMatchSnapshot()
    })

    test("backtab should switch agent in reverse, with wrap-around", async () => {
      // const mocks = await mockProviders()
      utils.testSetup = await testRenderTui({ url: s.url }, SIZES.SMALL)
      await utils.testSetup.renderOnce()
      await utils.testSetup.mockInput.typeText("blah blah") // have some initial input
      await sleep(100)

      // FIXME: opentui bug: following doesn't work
      // await ns.testSetup.mockInput.pressTab({ shift: true })
      // Workaround:
      function pressBacktab() {
        return utils.testSetup!.mockInput.pressKey("\x1b[Z")
      }

      await pressBacktab()
      await sleep(100)
      await utils.renderOnceExpectMatchSnapshot()

      await pressBacktab()
      await sleep(100)
      await utils.renderOnceExpectMatchSnapshot()
    })
  })
})
