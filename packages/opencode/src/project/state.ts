import { Log } from "@/util/log"

export namespace State {
  interface Entry {
    state: any
    dispose?: (state: any) => Promise<void>
  }

  const recordsByKey = new Map<string, { trackedPromises: Set<Promise<any>>, entries: Map<any, Entry> }>()

  export function create<S>(root: () => string, init: () => S, dispose?: (state: Awaited<S>) => Promise<void>) {
    return () => {
      const key = root()
      let record = recordsByKey.get(key)
      if (!record) {
        record = {
          entries: new Map<string, Entry>(),
          trackedPromises: new Set<Promise<any>>(),
        }
        recordsByKey.set(key, record)
      }
      const exists = record.entries.get(init)
      if (exists) return exists.state as S
      const state = init()
      record.entries.set(init, {
        state,
        dispose,
      })
      return state
    }
  }

  export async function dispose(key: string) {
    const record = recordsByKey.get(key)
    if (!record) return

    let disposalFinished = false

    setTimeout(() => {
      if (!disposalFinished) {
        Log.Default.warn("waiting for state disposal to complete... (this is usually a saving operation or subprocess shutdown)")
      }
    }, 1000).unref()

    setTimeout(() => {
      if (!disposalFinished) {
        Log.Default.warn("state disposal is taking an unusually long time - if it does not complete in a reasonable time, please report this as a bug")
      }
    }, 10000).unref()

    await Promise.allSettled(
      [...record.entries.values()]
        .map(async (entry) => await entry.dispose?.(await entry.state)),
    ).then((results) => {
      for (const result of results) {
        if (result.status === "rejected") {
          Log.Default.error("Error while disposing state:", result.reason)
        }
      }
    })

    await Promise.allSettled([...record.trackedPromises.values()])
      .then((results) => {
        for (const result of results) {
          if (result.status === "rejected") {
            Log.Default.error("Error while disposing state:", result.reason)
          }
        }
      })

    disposalFinished = true
  }

  /**
   * Track promises, making sure they have settled before state disposal is allowed to complete.
   */
  export function trackPromises<T>(key: string, promises: Promise<T>[]) {
    for (const promise of promises)
      recordsByKey.get(key)!.trackedPromises.add(promise)
  }
}
