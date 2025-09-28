import { createContext, Show, useContext, type ParentProps } from "solid-js"

export function createSimpleContext<T>(input: { name: string; init: () => T }) {
  const ctx = createContext<T>()

  return {
    provider: (props: ParentProps) => {
      const init = input.init()
      return (
        // @ts-expect-error
        <Show when={init.ready === undefined || init.ready === true}>
          <ctx.Provider value={init}>{props.children}</ctx.Provider>
        </Show>
      )
    },
    use() {
      const value = useContext(ctx)
      if (!value) throw new Error(`${input.name} context must be used within a context provider`)
      return value
    },
  }
}
