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
import { mockProviders, setUpCommonHooksAndUtils, setUpProviderMocking, SIZES } from "../fixture"

describe("Dialog", () => {
  let s: Awaited<ReturnType<typeof utils.createServer>>
  beforeAll(async () => {
    s = await utils.createServer()
    setSystemTime(new Date("2025-01-01T00:00:00.000Z"))
  })

  describe("Model dialog", () => {
    async function openDialogAndSleep() {
      utils.testSetup!.mockInput.pressKey("x", { ctrl: true })
      utils.testSetup!.mockInput.pressKey("m")
      await s.client.config.providers({ throwOnError: true })
      await utils.sleep(10)
    }

    test("ctrl-x m should open model dialog", async () => {
      await utils.testRenderTui(SIZES.MEDIUM, { height: 30 })
      utils.testSetup.renderOnce()
      await openDialogAndSleep()
      await utils.renderOnceExpectMatchSnapshot()
    })

    test("item navigation should work", async () => {
      await utils.testRenderTui(SIZES.NORMAL)
      await openDialogAndSleep()
      await utils.testSetup.mockInput.pressArrow("down")
      await utils.renderOnceExpectMatchSnapshot()
      await utils.testSetup.mockInput.pressArrow("down")
      await utils.renderOnceExpectMatchSnapshot()
      await utils.testSetup.mockInput.pressArrow("up")
      await utils.testSetup.mockInput.pressArrow("up")
      await utils.testSetup.mockInput.pressArrow("up")
      await utils.renderOnceExpectMatchSnapshot()
    })

    test("search should narrow candidates", async () => {
      await utils.testRenderTui(SIZES.SMALL)
      await openDialogAndSleep()
      await utils.testSetup.renderOnce()
      await utils.testSetup.mockInput.typeText("gpt41")
      await utils.renderOnceExpectMatchSnapshot()
    })

    test("enter should select first model", async () => {
      await utils.testRenderTui(SIZES.SMALL)
      await openDialogAndSleep()
      await utils.testSetup.renderOnce()
      await utils.testSetup.mockInput.pressEnter()
      await utils.renderOnceExpectMatchSnapshot()
    })

    test("enter with input should set selected model", async () => {
      await utils.testRenderTui(SIZES.SMALL)
      await openDialogAndSleep()
      await utils.testSetup.renderOnce()
      await utils.testSetup.mockInput.typeText("gpt41")
      await utils.testSetup.mockInput.pressEnter()
      await utils.renderOnceExpectMatchSnapshot()
    })

    test("enter should not submit prompt", async () => {
      const mocks = await mockProviders({ useRoute: true })
      await utils.testRenderTui(SIZES.SMALL)
      await utils.testSetup.mockInput.typeText("Hello")
      await openDialogAndSleep()
      await utils.testSetup.mockInput.pressEnter()
      await utils.renderOnceExpectMatchSnapshot()
      await utils.sleep(200)
      expect(mocks.useRoute.navigate).not.toHaveBeenCalled()
    })

    test("esc should close dialog", async () => {
      await utils.testRenderTui(SIZES.SMALL)
      await openDialogAndSleep()
      await utils.testSetup.mockInput.pressArrow("down")
      await utils.testSetup.mockInput.pressEscape()
      await utils.sleep(50)
      await utils.renderOnceExpectMatchSnapshot()
    })
  })

  test("ctrl-x p should open command dialog", async () => {
    await utils.testRenderTui(SIZES.SMALL, { height: 28 })
    utils.testSetup.mockInput.pressKey("p", { ctrl: true })
    await utils.renderOnceExpectMatchSnapshot()
  })

  test("ctrl-x l should open session list dialog", async () => {
    setSystemTime(new Date("2025-01-01T00:00:00.000Z"))
    const {
      data: { id: id1 },
    } = (await s.client.session.create({
      body: { title: "Session 1" },
    })) as any
    setSystemTime(new Date("2025-01-02T00:00:00.000Z"))
    const {
      data: { id: id2 },
    } = (await s.client.session.create({
      body: { title: "Session 2" },
    })) as any
    try {
      await utils.sleep(300)
      await utils.testRenderTui({ url: s.url }, SIZES.MEDIUM)
      utils.testSetup.mockInput.pressKey("x", { ctrl: true })
      utils.testSetup.mockInput.pressKey("l")
      await utils.renderOnceExpectMatchSnapshot()
    } finally {
      // FIXME: Fails when this is used
      //  - Currently no other tests are affected by sessions, so cleanup is not critical
      //  - Seems that renderer.destroy() doesn't invoke sdk's onCleanup hook
      // await s.client.session.delete({ path: { id: id1 }, throwOnError: true })
      // await s.client.session.delete({ path: { id: id2 }, throwOnError: true })
    }
  })

  test.todo("ctrl-x t should open theme list dialog", async () => {
    await utils.testRenderTui({ url: s.url }, SIZES.MEDIUM)
    utils.testSetup.mockInput.pressKey("x", { ctrl: true })
    utils.testSetup.mockInput.pressKey("t")
    await utils.renderOnceExpectMatchSnapshot()
  })

  test("/theme should open theme list dialog", async () => {
    await utils.testRenderTui({ url: s.url }, SIZES.SMALL)
    await utils.testSetup.mockInput.typeText("/theme")
    await utils.testSetup.mockInput.pressEnter()
    await utils.sleep(50)
    await utils.renderOnceExpectMatchSnapshot()
  })

  test("ctrl-x a should open agent list dialog", async () => {
    await utils.testRenderTui({ url: s.url }, SIZES.MEDIUM)
    utils.testSetup.mockInput.pressKey("x", { ctrl: true })
    utils.testSetup.mockInput.pressKey("a")
    await utils.renderOnceExpectMatchSnapshot()
  })
})
