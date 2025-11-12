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
import { sleep } from "bun"

describe("Home", () => {
  let s: Awaited<ReturnType<typeof utils.createServer>>
  let llm: Awaited<ReturnType<typeof utils.createLLM>>
  beforeAll(async () => {
    s = await utils.createServer()
    llm = await utils.createLLM()
    setSystemTime(new Date("2025-01-01T00:00:00.000Z"))
  })

  test("should render correctly", async () => {
    await utils.testRenderTui(SIZES.MEDIUM)
    await utils.renderOnceExpectMatchSnapshot()
  })

  test("should resize correctly", async () => {
    await utils.testRenderTui(SIZES.NORMAL)
    await utils.testSetup.renderOnce()
    utils.testSetup.resize(SIZES.SMALL.width, SIZES.SMALL.height)
    await utils.renderOnceExpectMatchSnapshot()
  })

  test("prompt should start a new session", async () => {
    const titleResponse = {
      id: "chatcmpl-123",
      object: "chat.completion",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "Simple session",
          },
          finish_reason: "stop",
        },
      ],
    }
    const helloResponse = {
      id: "chatcmpl-123",
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: "gpt-3.5-turbo",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "Hello! How can I help you today?",
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 9,
        completion_tokens: 12,
        total_tokens: 21,
      },
    }

    llm.server.respond.mockImplementationOnce(async () => {
      llm.server.respond.mockImplementationOnce(() => titleResponse)
      return helloResponse
      // if (JSON.stringify(body).includes(JSON.stringify({role: "user", content: "Hello, world!"}))) {
      //   return helloResponse
      // }
      // return titleResponse
    })
    const originalModel = (await s.client.config.get()).data!.model
    await s.client.config.update({ body: { model: "mock-provider/mock-model" } })
    try {
      await utils.testRenderTui(SIZES.MEDIUM)
      await utils.testSetup.mockInput.typeText("Hello, world!")
      await utils.testSetup.mockInput.pressEnter()
      await utils.sleep(3000)

      await utils.renderOnceExpectMatchSnapshot()
    } finally {
      await s.client.config.update({ body: { model: originalModel } })
    }
  }, 999999) // TODO

  describe("Toast", () => {
    test("should render correctly", async () => {
      await utils.testRenderTui(SIZES.SMALL)
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

    // FIXME: flaky, I think because sdk's onCleanup is not called
    test("should clear after timeout", async () => {
      await utils.testRenderTui(SIZES.SMALL)
      await utils.sleep(50)
      await s.client.tui.showToast({
        body: {
          variant: "error",
          message: "This is a toast message",
          duration: 500,
          title: "Toast Title",
        },
        throwOnError: true,
      })
      await utils.sleep(300)
      await utils.renderOnceExpectMatchSnapshot()

      await utils.sleep(600)
      await utils.renderOnceExpectMatchSnapshot()
    })
  })

  describe("Prompt", () => {
    describe("! mode", () => {
      test("! should open shell mode", async () => {
        await utils.testRenderTui(SIZES.SMALL)
        await utils.testSetup.mockInput.typeText("!")
        await utils.sleep(100)
        await utils.renderOnceExpectMatchSnapshot()
      })
      test.failing("esc should revert to normal mode", async () => {
        await utils.testRenderTui(SIZES.SMALL)
        await utils.testSetup.mockInput.typeText("!test")
        await utils.testSetup.mockInput.pressEscape()
        await utils.sleep(100)
        await utils.renderOnceExpectMatchSnapshot()
      })
      test("backspace should revert to normal mode", async () => {
        await utils.testRenderTui(SIZES.SMALL)
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
      await utils.testRenderTui(SIZES.SMALL)
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
      await utils.testRenderTui(SIZES.SMALL)
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
