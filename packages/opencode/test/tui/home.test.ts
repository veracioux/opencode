await setUpProviderMocks()

import { test, expect, describe, beforeAll, beforeEach, mock, afterEach, xdescribe } from "bun:test"
import os from "os"
import { mockProviders, setUpProviderMocks } from "./fixture"
import fs from "fs/promises"
import path from "path"
import { testRenderTui } from "./fixture_.tsx"

describe("Home", () => {
  let tmpdir: string
  let homedir: string
  beforeAll(async () => {
    tmpdir = os.tmpdir()
    process.chdir(tmpdir)
  })

  beforeEach(async () => {
    setUpProviderMocks()
    mockProviders()
    homedir = await fs.mkdtemp(tmpdir + path.sep)
    process.env.HOME = homedir
  })

  afterEach(async () => {
    mock.restore()
    await fs.rmdir(homedir)
  })

  test("should render correctly", async () => {
    const testSetup = await testRenderTui({
      width: 80,
      height: 25,
    })
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    expect(frame).toMatchSnapshot()
  })

  test("should resize correctly", async () => {
    const testSetup = await testRenderTui({
      width: 100,
      height: 30,
    })
    await testSetup.renderOnce()
    testSetup.resize(60, 20)
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    expect(frame).toMatchSnapshot()
  })

  describe("Model dialog", () => {
    // FIXME: Not implemented fully
    test("should open model dialog", async () => {
      const testSetup = await testRenderTui({
        width: 50,
        height: 25,
      })
      await mockProviders(
        {
          useSync: {
            data: {
              config: {
                keybinds: {
                  model_list: "<leader>m",
                }
              }
            }
          },
          useKeybind: false,
        },
      )
      // expect(useSyncMock.fn).toBeCalled()
      await testSetup.renderOnce()
      testSetup.mockInput.pressKey("x", { ctrl: true })
      testSetup.mockInput.pressKey("m")
      await testSetup.renderOnce()
      const frame = testSetup.captureCharFrame()
      expect(frame).toMatchSnapshot()
    })
  })
})
