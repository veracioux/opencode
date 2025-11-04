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

const utils = setUpCommonHooksAndUtils()

describe("Dialog", () => {
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

  describe("Model dialog", () => {
    test("ctrl-x m should open model dialog", async () => {
      utils.testSetup = await testRenderTui(SIZES.MEDIUM)
      utils.testSetup.mockInput.pressKey("x", { ctrl: true })
      utils.testSetup.mockInput.pressKey("m")
      await utils.renderOnceExpectMatchSnapshot()
    })

    test("item navigation should work", async () => {
      utils.testSetup = await testRenderTui(SIZES.SMALL)
      await utils.testSetup.mockInput.typeText("/model")
      await utils.testSetup.mockInput.pressEnter()
      await utils.testSetup.renderOnce()
      await utils.sleep(50)
      utils.testSetup.mockInput.pressArrow("down")
      await utils.renderOnceExpectMatchSnapshot()
      utils.testSetup.mockInput.pressArrow("down")
      await utils.renderOnceExpectMatchSnapshot()
      utils.testSetup.mockInput.pressArrow("up")
      utils.testSetup.mockInput.pressArrow("up")
      utils.testSetup.mockInput.pressArrow("up")
      await utils.renderOnceExpectMatchSnapshot()
    })
  })

  test("ctrl-x p should open command dialog", async () => {
    utils.testSetup = await testRenderTui({ ...SIZES.SMALL, height: 28 })
    utils.testSetup.mockInput.pressKey("p", { ctrl: true })
    await utils.renderOnceExpectMatchSnapshot()
  })

  test("ctrl-x l should open session list dialog", async () => {
    utils.testSetup = await testRenderTui(SIZES.MEDIUM)
    utils.testSetup.mockInput.pressKey("x", { ctrl: true })
    utils.testSetup.mockInput.pressKey("l")
    await utils.renderOnceExpectMatchSnapshot()
  })

  test.todo("ctrl-x t should open theme list dialog", async () => {
    utils.testSetup = await testRenderTui(SIZES.MEDIUM)
    utils.testSetup.mockInput.pressKey("x", { ctrl: true })
    utils.testSetup.mockInput.pressKey("t")
    await utils.renderOnceExpectMatchSnapshot()
  })

  test("/theme should open theme list dialog", async () => {
    utils.testSetup = await testRenderTui(SIZES.SMALL)
    await utils.testSetup.mockInput.typeText("/theme")
    await utils.testSetup.mockInput.pressEnter()
    await utils.sleep(50)
    await utils.renderOnceExpectMatchSnapshot()
  })

  test("ctrl-x a should open agent list dialog", async () => {
    utils.testSetup = await testRenderTui(SIZES.MEDIUM)
    utils.testSetup.mockInput.pressKey("x", { ctrl: true })
    utils.testSetup.mockInput.pressKey("a")
    await utils.renderOnceExpectMatchSnapshot()
  })

  test("esc should close dialog", async () => {
    utils.testSetup = await testRenderTui(SIZES.SMALL)
    utils.testSetup.mockInput.pressKey("x", { ctrl: true })
    utils.testSetup.mockInput.pressKey("l")
    utils.testSetup.mockInput.pressEscape()
    await utils.sleep(50)
    await utils.renderOnceExpectMatchSnapshot()
  })
})
