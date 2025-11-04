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

  test("ctrl-x m should open model dialog", async () => {
    ns.testSetup = await testRenderTui(SIZES.MEDIUM)
    ns.testSetup.mockInput.pressKey("x", { ctrl: true })
    ns.testSetup.mockInput.pressKey("m")
    await ns.testSetup.renderOnce()
    const frame = ns.testSetup.captureCharFrame()
    expect(frame).toMatchSnapshot()
  })

  test("ctrl-x p should open command dialog", async () => {
    ns.testSetup = await testRenderTui({ ...SIZES.SMALL, height: 28  })
    ns.testSetup.mockInput.pressKey("p", { ctrl: true })
    await ns.testSetup.renderOnce()
    const frame = ns.testSetup.captureCharFrame()
    expect(frame).toMatchSnapshot()
  })

  test("ctrl-x l should open session list dialog", async () => {
    ns.testSetup = await testRenderTui(SIZES.MEDIUM)
    ns.testSetup.mockInput.pressKey("x", { ctrl: true })
    ns.testSetup.mockInput.pressKey("l")
    await ns.testSetup.renderOnce()
    const frame = ns.testSetup.captureCharFrame()
    expect(frame).toMatchSnapshot()
  })

  test.todo("ctrl-x t should open theme list dialog", async () => {
    ns.testSetup = await testRenderTui(SIZES.MEDIUM)
    ns.testSetup.mockInput.pressKey("x", { ctrl: true })
    ns.testSetup.mockInput.pressKey("t")
    await ns.testSetup.renderOnce()
    const frame = ns.testSetup.captureCharFrame()
    expect(frame).toMatchSnapshot()
  })

  test("ctrl-x a should open agent list dialog", async () => {
    ns.testSetup = await testRenderTui(SIZES.MEDIUM)
    ns.testSetup.mockInput.pressKey("x", { ctrl: true })
    ns.testSetup.mockInput.pressKey("a")
    await ns.testSetup.renderOnce()
    const frame = ns.testSetup.captureCharFrame()
    expect(frame).toMatchSnapshot()
  })

  test("esc should close dialog", async () => {
    ns.testSetup = await testRenderTui(SIZES.SMALL)
    ns.testSetup.mockInput.pressKey("x", { ctrl: true })
    ns.testSetup.mockInput.pressKey("l")
    ns.testSetup.mockInput.pressEscape()
    await new Promise((r) => setTimeout(r, 50))
    await ns.testSetup.renderOnce()
    const frame = ns.testSetup.captureCharFrame()
    expect(frame).toMatchSnapshot()
  })
})
