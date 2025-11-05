import { createOpencodeClient, type AgentPartInput, type Event, type FilePartInput, type Part, type TextPart, type TextPartInput } from "@opencode-ai/sdk"
import { createSimpleContext } from "./helper"
import { createGlobalEmitter } from "@solid-primitives/event-bus"
import { onCleanup } from "solid-js"
import { useLocal } from "@tui/context/local"
import { Identifier } from "@/id/id"

export const { use: useSDK, provider: SDKProvider } = createSimpleContext({
  name: "SDK",
  init: (props: { url: string }) => {
    const abort = new AbortController()
    const sdk = createOpencodeClient({
      baseUrl: props.url,
      signal: abort.signal,
      fetch: (req) => {
        // @ts-ignore
        req.timeout = false
        return fetch(req)
      },
    })

    const emitter = createGlobalEmitter<{
      [key in Event["type"]]: Extract<Event, { type: key }>
    }>()

    sdk.event.subscribe().then(async (events) => {
      for await (const event of events.stream) {
        console.log("event", event.type)
        emitter.emit(event.type, event)
      }
    })

    onCleanup(() => {
      abort.abort()
    })

    return { client: sdk, event: emitter }
  },
})

export const { use: useStatefulSDK, provider: StatefulSDKProvider } = createSimpleContext({
  name: "StatefulSDK",
  init: () => {
    const sdk = useSDK()
    const local = useLocal()

    return {
      async submitPrompt(sessionID: string, parts: Array<TextPartInput | AgentPartInput | FilePartInput>) {
        return sdk.client.session.prompt({
          path: {
            id: sessionID,
          },
          body: {
            ...local.model.current(),
            messageID: Identifier.ascending("message"),
            agent: local.agent.current().name,
            model: local.model.current(),
            parts,
          },
          throwOnError: true,
        })
      }
    }
  },
})
