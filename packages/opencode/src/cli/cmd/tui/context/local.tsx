import { createStore } from "solid-js/store"
import { batch, createEffect, createMemo, createSignal } from "solid-js"
import { useSync } from "@tui/context/sync"
import { Theme } from "@tui/context/theme"
import { uniqueBy } from "remeda"
import path from "path"
import { Global } from "@/global"
import { iife } from "@/util/iife"
import { createSimpleContext } from "./helper"

export const { use: useLocal, provider: LocalProvider } = createSimpleContext({
  name: "Local",
  init: () => {
    const sync = useSync()

    const agent = iife(() => {
      const agents = createMemo(() => sync.data.agent.filter((x) => x.mode !== "subagent"))
      const [agentStore, setAgentStore] = createStore<{
        current: string
      }>({
        current: agents()[0].name,
      })
      return {
        list() {
          return agents()
        },
        current() {
          return agents().find((x) => x.name === agentStore.current)!
        },
        set(name: string) {
          setAgentStore("current", name)
        },
        move(direction: 1 | -1) {
          let next = agents().findIndex((x) => x.name === agentStore.current) + direction
          if (next < 0) next = agents().length - 1
          if (next >= agents().length) next = 0
          const value = agents()[next]
          setAgentStore("current", value.name)
          if (value.model)
            model.set({
              providerID: value.model.providerID,
              modelID: value.model.modelID,
            })
        },
        color(name: string) {
          const index = agents().findIndex((x) => x.name === name)
          const colors = [Theme.secondary, Theme.accent, Theme.success, Theme.warning, Theme.primary, Theme.error]
          return colors[index % colors.length]
        },
      }
    })

    const model = iife(() => {
      const [modelStore, setModelStore] = createStore<{
        ready: boolean
        model: Record<
          string,
          {
            providerID: string
            modelID: string
          }
        >
        recent: {
          providerID: string
          modelID: string
        }[]
      }>({
        ready: false,
        model: {},
        recent: [],
      })

      const file = Bun.file(path.join(Global.Path.state, "model.json"))

      file
        .json()
        .then((x) => {
          setModelStore("recent", x.recent)
        })
        .catch(() => {})
        .finally(() => {
          setModelStore("ready", true)
        })

      createEffect(() => {
        Bun.write(
          file,
          JSON.stringify({
            recent: modelStore.recent,
          }),
        )
      })

      const fallbackModel = createMemo(() => {
        function isValid(providerID: string, modelID: string) {
          const provider = sync.data.provider.find((x) => x.id === providerID)
          if (!provider) return false
          const model = provider.models[modelID]
          if (!model) return false
          return true
        }

        if (sync.data.config.model) {
          const [providerID, modelID] = sync.data.config.model.split("/")
          if (isValid(providerID, modelID)) {
            return {
              providerID,
              modelID,
            }
          }
        }

        for (const item of modelStore.recent) {
          if (isValid(item.providerID, item.modelID)) {
            return item
          }
        }
        const provider = sync.data.provider[0]
        const model = Object.values(provider.models)[0]
        return {
          providerID: provider.id,
          modelID: model.id,
        }
      })

      const currentModel = createMemo(() => {
        const a = agent.current()
        return modelStore.model[agent.current().name] ?? (a.model ? a.model : fallbackModel())
      })

      return {
        current: currentModel,
        get ready() {
          return modelStore.ready
        },
        recent() {
          return modelStore.recent
        },
        parsed: createMemo(() => {
          const value = currentModel()
          const provider = sync.data.provider.find((x) => x.id === value.providerID)!
          const model = provider.models[value.modelID]
          return {
            provider: provider.name ?? value.providerID,
            model: model.name ?? value.modelID,
          }
        }),
        set(model: { providerID: string; modelID: string }, options?: { recent?: boolean }) {
          batch(() => {
            setModelStore("model", agent.current().name, model)
            if (options?.recent) {
              const uniq = uniqueBy([model, ...modelStore.recent], (x) => x.providerID + x.modelID)
              if (uniq.length > 5) uniq.pop()
              setModelStore("recent", uniq)
            }
          })
        },
      }
    })

    const kv = iife(() => {
      const [ready, setReady] = createSignal(false)
      const [kvStore, setKvStore] = createStore({
        openrouter_warning: false,
      })
      const file = Bun.file(path.join(Global.Path.state, "kv.json"))

      file
        .json()
        .then((x) => {
          setKvStore(x)
        })
        .catch(() => {})
        .finally(() => {
          setReady(true)
        })

      return {
        get data() {
          return kvStore
        },
        get ready() {
          return ready()
        },
        set(key: string, value: any) {
          setKvStore(key as any, value)
          Bun.write(
            file,
            JSON.stringify({
              [key]: value,
            }),
          )
        },
      }
    })

    const result = {
      model,
      agent,
      kv,
      get ready() {
        return kv.ready && model.ready
      },
    }
    return result
  },
})
