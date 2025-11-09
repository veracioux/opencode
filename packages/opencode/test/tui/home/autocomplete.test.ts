const utils = setUpCommonHooksAndUtils()

import { beforeAll, describe, expect, mock, test } from "bun:test"
import { testRenderTui } from "../fixture_"
import { setUpCommonHooksAndUtils, SIZES } from "../fixture"

/** Wait for the autocomplete popup to open */
const waitForOpen = () => utils.sleep(300)

let s: Awaited<ReturnType<typeof utils.createIsolatedServer>>
beforeAll(async () => {
  s = await utils.createIsolatedServer()
  // Let the server boot up
  await utils.sleep(2500)
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

  test("should narrow /ex input to /exit", async () => {
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

  test("enter on custom command should expect args", async () => {
    utils.testSetup = await testRenderTui({ url: s.url }, SIZES.SMALL)
    await utils.testSetup.mockInput.typeText("/long-c")
    await utils.testSetup.mockInput.pressEnter()
    await utils.testSetup.mockInput.typeText("arg1 arg2")
    await utils.renderOnceExpectMatchSnapshot()
  })

  test("/ exact matches should be prioritized", async () => {
    utils.testSetup = await testRenderTui({ url: s.url }, SIZES.SMALL)
    await utils.testSetup.mockInput.typeText("/e")
    await waitForOpen()
    await utils.renderOnceExpectMatchSnapshot()
  })
})

describe("@ mode", () => {
  test("@ should open autocomplete", async () => {
    utils.testSetup = await testRenderTui({ url: s.url }, SIZES.SMALL)
    await utils.testSetup.renderOnce()
    await utils.testSetup.mockInput.typeText("@")
    await waitForOpen()
    await utils.renderOnceExpectMatchSnapshot()
  })

  test("should match items correctly", async () => {
    utils.testSetup = await testRenderTui({ url: s.url }, SIZES.SMALL)
    await utils.testSetup.renderOnce()
    await utils.testSetup.mockInput.typeText("@file1")
    await waitForOpen()
    await utils.renderOnceExpectMatchSnapshot()
  })

  test("should trigger at the end of text", async () => {
    utils.testSetup = await testRenderTui({ url: s.url }, SIZES.SMALL)
    await utils.testSetup.renderOnce()
    await utils.testSetup.mockInput.typeText("blah @file1")
    await waitForOpen()
    await utils.renderOnceExpectMatchSnapshot()
  })

  test("should trigger in the middle of text", async () => {
    utils.testSetup = await testRenderTui({ url: s.url }, SIZES.SMALL)
    await utils.testSetup.renderOnce()
    await utils.testSetup.mockInput.typeText("blah blah")
    " blah".split("").forEach(() => utils.testSetup.mockInput.pressArrow("left"))
    await utils.testSetup.mockInput.typeText(" @")
    await waitForOpen()
    await utils.renderOnceExpectMatchSnapshot()
  })

  test("enter should confirm choice", async () => {
    utils.testSetup = await testRenderTui({ url: s.url }, SIZES.SMALL)
    await utils.testSetup.mockInput.typeText("@file2")
    await waitForOpen()
    await utils.testSetup.mockInput.pressEnter()
    await utils.sleep(100)
    await utils.renderOnceExpectMatchSnapshot()
  })

  test("tab should confirm choice", async () => {
    utils.testSetup = await testRenderTui({ url: s.url }, SIZES.SMALL)
    await utils.testSetup.mockInput.typeText("@file1")
    await waitForOpen()
    await utils.testSetup.mockInput.pressTab()
    await utils.sleep(100)
    await utils.renderOnceExpectMatchSnapshot()
  })

  test("esc should close", async () => {
    utils.testSetup = await testRenderTui({ url: s.url }, SIZES.SMALL)
    await utils.testSetup.renderOnce()
    await utils.testSetup.mockInput.typeText("@file1")
    await waitForOpen()
    await utils.testSetup.mockInput.pressEscape()
    await utils.sleep(100)
    await utils.renderOnceExpectMatchSnapshot()
  })

  test("clearing input should close", async () => {
    utils.testSetup = await testRenderTui({ url: s.url }, SIZES.SMALL)
    await utils.testSetup.renderOnce()
    await utils.testSetup.mockInput.typeText(`blah @file1`)
    await waitForOpen()
    "@file1".split("").forEach(() => utils.testSetup.mockInput.pressBackspace()),
    await utils.sleep(100)
    await utils.renderOnceExpectMatchSnapshot()
  })

  // TODO: Ask to make sure this is desired behavior
  test.todo("space should close", async () => { })

  test.todo("should honor input_submit binding", async () => { })
})
