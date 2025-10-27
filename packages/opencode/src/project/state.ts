import { Log } from "@/util/log"

export namespace State {
  interface Entry {
    state: any
    dispose?: (state: any) => Promise<void>
  }

  const log = Log.create({ service: "state" })
  const recordsByKey = new Map<string, Map<any, Entry>>()

  export function create<S>(root: () => string, init: () => S, dispose?: (state: Awaited<S>) => Promise<void>) {
    return () => {
      const key = root()
      let entries = recordsByKey.get(key)
      if (!entries) {
        entries = new Map<string, Entry>()
        recordsByKey.set(key, entries)
      }
      const exists = entries.get(init)
      if (exists) return exists.state as S
      const state = init()
      entries.set(init, {
        state,
        dispose,
      })
      return state
    }
  }

  export async function dispose(key: string) {
    const entries = recordsByKey.get(key)
    if (!entries) return

    let disposalFinished = false

    setTimeout(() => {
      if (!disposalFinished) {
        log.warn(
          "waiting for state disposal to complete... (this is usually a saving operation or subprocess shutdown)",
        )
      }
    }, 1000).unref()

    setTimeout(() => {
      if (!disposalFinished) {
        log.warn(
          "state disposal is taking an unusually long time - if it does not complete in a reasonable time, please report this as a bug",
        )
      }
    }, 10000).unref()

    await Promise.allSettled([...entries.values()].map(async (entry) => await entry.dispose?.(await entry.state))).then(
      (results) => {
        for (const result of results) {
          if (result.status === "rejected") {
            log.error("Error while disposing state:", result.reason)
          }
        }
      },
    )

    disposalFinished = true
  }
}
