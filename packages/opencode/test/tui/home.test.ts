import { testRender } from "@opentui/solid"
import { test, expect, describe, beforeAll, beforeEach, afterAll, mock, xtest } from "bun:test"
import { App } from "@/cli/cmd/tui/app"
import os from "os"
import { mockUseFn, setUpDefaultMocks } from "./fixture"

describe("Home", () => {
  let dir: string
  beforeAll(async () => {
    dir = os.tmpdir()
    process.chdir(dir)
  })

  beforeEach(async () => {
    await setUpDefaultMocks()
  })

  test("should render correctly", async () => {
    const testSetup = await testRender(
      () => App(),
      {
        width: 80,
        height: 25,
      }
    )
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    expect(frame).toMatchSnapshot()
  })

  test("should resize correctly", async () => {
    const testSetup = await testRender(
      () => App(),
      {
        width: 100,
        height: 30,
      }
    )
    await testSetup.renderOnce()
    testSetup.resize(60, 20)
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    expect(frame).toMatchSnapshot()
  })

  describe("Model dialog", () => {
    // FIXME: Not implemented fully
    xtest("should open model dialog", async () => {
      const testSetup = await testRender(
        () => App(),
        {
          width: 50,
          height: 25,
        }
      )
      await mockUseFn(
        "useKeybind",
        {
          match(key, evt) {
            if (key === "model_list" && evt.name === "m" && evt.ctrl && !evt.meta && !evt.shift)
              return true
            return false
          },
        },
        true,
      )
      testSetup.mockInput.pressKey("m", { ctrl: true })
      await testSetup.renderOnce()
      const frame = testSetup.captureCharFrame()
      expect(frame).toMatchSnapshot()
    })
  })
})
