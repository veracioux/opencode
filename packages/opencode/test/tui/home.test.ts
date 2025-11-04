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
import { mockProviders, setUpCommonHooks, setUpProviderMocking, type MockConfig } from "./fixture"
import { testRenderTui } from "./fixture_.tsx"
import { mockIdentifiers } from "../fixture/fixture.ts"

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
    ns.testSetup = await testRenderTui({
      width: 80,
      height: 25,
    })
    await ns.testSetup.renderOnce()
    const frame = ns.testSetup.captureCharFrame()
    expect(frame).toMatchSnapshot()
  })

  test("should resize correctly", async () => {
    ns.testSetup = await testRenderTui({
      width: 100,
      height: 30,
    })
    await ns.testSetup.renderOnce()
    ns.testSetup.resize(60, 20)
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

    ns.testSetup = await testRenderTui({
      width: 80,
      height: 25,
    })
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

  test("/ should open autocomplete", async () => {
    ns.testSetup = await testRenderTui({
      width: 60,
      height: 20,
    })
    await ns.testSetup.renderOnce()
    await ns.testSetup.mockInput.typeText("/")
    await ns.testSetup.renderOnce()
    const frame = ns.testSetup.captureCharFrame()
    expect(frame).toMatchSnapshot()
  })

  test("should narrow /ex input to /exit", async () => {
    ns.testSetup = await testRenderTui({
      width: 60,
      height: 20,
    })
    await ns.testSetup.renderOnce()
    await ns.testSetup.mockInput.typeText("/ex")
    await ns.testSetup.renderOnce()
    const frame = ns.testSetup.captureCharFrame()
    expect(frame).toMatchSnapshot()
  })

  test("/ex + enter should trigger action", async () => {
    const mocks = await mockProviders({})
    ns.testSetup = await testRenderTui({
      width: 60,
      height: 20,
    })
    await ns.testSetup.renderOnce()
    await ns.testSetup.mockInput.typeText("/ex")
    await ns.testSetup.mockInput.pressEnter()
    await ns.testSetup.renderOnce()
    expect(mocks.useExit).toHaveBeenCalled()

    const frame = ns.testSetup.captureCharFrame()
    expect(frame).toMatchSnapshot()
  })

  describe("Model dialog", () => {
    test("should open model dialog", async () => {
      ns.testSetup = await testRenderTui({
        width: 80,
        height: 28,
      })
      ns.testSetup.mockInput.pressKey("x", { ctrl: true })
      ns.testSetup.mockInput.pressKey("m")
      await ns.testSetup.renderOnce()
      const frame = ns.testSetup.captureCharFrame()
      expect(frame).toMatchSnapshot()
    })
  })
})
