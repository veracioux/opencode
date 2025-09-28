import { createOpencodeClient } from "@opencode-ai/sdk"
import { Server } from "@/server/server"
import { createSimpleContext } from "./helper"

export const { use: useSDK, provider: SDKProvider } = createSimpleContext({
  name: "SDK",
  init: () => {
    const client = createOpencodeClient({
      baseUrl: "http://localhost:4096",
      // @ts-ignore
      fetch: async (r) => {
        // @ts-ignore
        return Server.App().fetch(r)
      },
    })
    return client
  },
})
