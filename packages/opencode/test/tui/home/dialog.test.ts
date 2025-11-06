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
  mockProviders,
  setUpCommonHooksAndUtils,
  setUpProviderMocking,
  SIZES,
} from "../fixture"
import { testRenderTui } from "../fixture_.tsx"

describe("Dialog", () => {
  let s: Awaited<ReturnType<typeof utils.createIsolatedServer>>
  beforeAll(async () => {
    s = await utils.createIsolatedServer()
    // Let the server boot up
    await utils.sleep(2500)
    setSystemTime(new Date("2025-01-01T00:00:00.000Z"))
  })

  describe("Model dialog", () => {
    async function openDialogAndSleep() {
      utils.testSetup!.mockInput.pressKey("x", { ctrl: true })
      utils.testSetup!.mockInput.pressKey("m")
      await utils.sleep(50)
    }

    test.only("ctrl-x m should open model dialog", async () => {
      utils.testSetup = await testRenderTui({ url: s.url }, { ...SIZES.MEDIUM, height: 30 })
      await openDialogAndSleep()
      await utils.renderOnceExpectMatchSnapshot()
    })

    test.only("item navigation should work", async () => {
      utils.testSetup = await testRenderTui({ url: s.url }, SIZES.SMALL)
      await openDialogAndSleep()
      utils.testSetup.mockInput.pressArrow("down")
      await utils.renderOnceExpectMatchSnapshot()
      utils.testSetup.mockInput.pressArrow("down")
      await utils.renderOnceExpectMatchSnapshot()
      utils.testSetup.mockInput.pressArrow("up")
      utils.testSetup.mockInput.pressArrow("up")
      utils.testSetup.mockInput.pressArrow("up")
      await utils.renderOnceExpectMatchSnapshot()
    })

    test("search should narrow candidates", async () => {
      utils.testSetup = await testRenderTui({ url: s.url }, SIZES.SMALL)
      await openDialogAndSleep()
      await utils.testSetup.renderOnce()
      await utils.testSetup.mockInput.typeText("mockmodel2")
      await utils.renderOnceExpectMatchSnapshot()
    })

    test("enter should select first model", async () => {
      utils.testSetup = await testRenderTui({ url: s.url }, SIZES.SMALL)
      await openDialogAndSleep()
      await utils.testSetup.renderOnce()
      await utils.testSetup.mockInput.pressEnter()
      await utils.renderOnceExpectMatchSnapshot()
    })

    test("enter with input should set selected model", async () => {
      utils.testSetup = await testRenderTui({ url: s.url }, SIZES.SMALL)
      await openDialogAndSleep()
      await utils.testSetup.renderOnce()
      await utils.testSetup.mockInput.typeText("mockmodel1")
      await utils.testSetup.mockInput.pressEnter()
      await utils.renderOnceExpectMatchSnapshot()
    })

    test("enter should not submit prompt", async () => {
      const mocks = await mockProviders({ useRoute: true })
      utils.testSetup = await testRenderTui({ url: s.url }, SIZES.SMALL)
      await utils.testSetup.mockInput.typeText("Hello")
      await openDialogAndSleep()
      await utils.testSetup.mockInput.pressEnter()
      await utils.renderOnceExpectMatchSnapshot()
      await utils.sleep(200)
      expect(mocks.useRoute.navigate).not.toHaveBeenCalled()
    })
  })

  test("ctrl-x p should open command dialog", async () => {
    utils.testSetup = await testRenderTui({ url: s.url }, { ...SIZES.SMALL, height: 28 })
    utils.testSetup.mockInput.pressKey("p", { ctrl: true })
    await utils.renderOnceExpectMatchSnapshot()
  })

  test("ctrl-x l should open session list dialog", async () => {
    utils.testSetup = await testRenderTui({ url: s.url }, SIZES.MEDIUM)
    utils.testSetup.mockInput.pressKey("x", { ctrl: true })
    utils.testSetup.mockInput.pressKey("l")
    await utils.renderOnceExpectMatchSnapshot()
  })

  test.todo("ctrl-x t should open theme list dialog", async () => {
    utils.testSetup = await testRenderTui({ url: s.url }, SIZES.MEDIUM)
    utils.testSetup.mockInput.pressKey("x", { ctrl: true })
    utils.testSetup.mockInput.pressKey("t")
    await utils.renderOnceExpectMatchSnapshot()
  })

  test("/theme should open theme list dialog", async () => {
    utils.testSetup = await testRenderTui({ url: s.url }, SIZES.SMALL)
    await utils.testSetup.mockInput.typeText("/theme")
    await utils.testSetup.mockInput.pressEnter()
    await utils.sleep(50)
    await utils.renderOnceExpectMatchSnapshot()
  })

  test("ctrl-x a should open agent list dialog", async () => {
    utils.testSetup = await testRenderTui({ url: s.url }, SIZES.MEDIUM)
    utils.testSetup.mockInput.pressKey("x", { ctrl: true })
    utils.testSetup.mockInput.pressKey("a")
    await utils.renderOnceExpectMatchSnapshot()
  })

  test("esc should close dialog", async () => {
    utils.testSetup = await testRenderTui({ url: s.url }, SIZES.SMALL)
    utils.testSetup.mockInput.pressKey("x", { ctrl: true })
    utils.testSetup.mockInput.pressKey("l")
    utils.testSetup.mockInput.pressEscape()
    await utils.sleep(50)
    await utils.renderOnceExpectMatchSnapshot()
  })
})
