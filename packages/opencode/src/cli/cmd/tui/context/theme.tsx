import { SyntaxStyle, RGBA } from "@opentui/core"
import { createEffect, createMemo, createSignal } from "solid-js"
import { useSync } from "@tui/context/sync"
import { createSimpleContext } from "./helper"
import aura from "../../../../../../tui/internal/theme/themes/aura.json" with { type: "json" }
import ayu from "../../../../../../tui/internal/theme/themes/ayu.json" with { type: "json" }
import catppuccin from "../../../../../../tui/internal/theme/themes/catppuccin.json" with { type: "json" }
import cobalt2 from "../../../../../../tui/internal/theme/themes/cobalt2.json" with { type: "json" }
import dracula from "../../../../../../tui/internal/theme/themes/dracula.json" with { type: "json" }
import everforest from "../../../../../../tui/internal/theme/themes/everforest.json" with { type: "json" }
import github from "../../../../../../tui/internal/theme/themes/github.json" with { type: "json" }
import gruvbox from "../../../../../../tui/internal/theme/themes/gruvbox.json" with { type: "json" }
import kanagawa from "../../../../../../tui/internal/theme/themes/kanagawa.json" with { type: "json" }
import material from "../../../../../../tui/internal/theme/themes/material.json" with { type: "json" }
import matrix from "../../../../../../tui/internal/theme/themes/matrix.json" with { type: "json" }
import monokai from "../../../../../../tui/internal/theme/themes/monokai.json" with { type: "json" }
import nord from "../../../../../../tui/internal/theme/themes/nord.json" with { type: "json" }
import onedark from "../../../../../../tui/internal/theme/themes/one-dark.json" with { type: "json" }
import opencode from "../../../../../../tui/internal/theme/themes/opencode.json" with { type: "json" }
import palenight from "../../../../../../tui/internal/theme/themes/palenight.json" with { type: "json" }
import rosepine from "../../../../../../tui/internal/theme/themes/rosepine.json" with { type: "json" }
import solarized from "../../../../../../tui/internal/theme/themes/solarized.json" with { type: "json" }
import synthwave84 from "../../../../../../tui/internal/theme/themes/synthwave84.json" with { type: "json" }
import tokyonight from "../../../../../../tui/internal/theme/themes/tokyonight.json" with { type: "json" }
import vesper from "../../../../../../tui/internal/theme/themes/vesper.json" with { type: "json" }
import zenburn from "../../../../../../tui/internal/theme/themes/zenburn.json" with { type: "json" }
import { useKV } from "./kv"
import path from "path"
import { Config } from "@/config/config"
import { useToast } from "../ui/toast"
import { iife } from "@/util/iife"

type Theme = {
  primary: RGBA
  secondary: RGBA
  accent: RGBA
  error: RGBA
  warning: RGBA
  success: RGBA
  info: RGBA
  text: RGBA
  textMuted: RGBA
  background: RGBA
  backgroundPanel: RGBA
  backgroundElement: RGBA
  border: RGBA
  borderActive: RGBA
  borderSubtle: RGBA
  diffAdded: RGBA
  diffRemoved: RGBA
  diffContext: RGBA
  diffHunkHeader: RGBA
  diffHighlightAdded: RGBA
  diffHighlightRemoved: RGBA
  diffAddedBg: RGBA
  diffRemovedBg: RGBA
  diffContextBg: RGBA
  diffLineNumber: RGBA
  diffAddedLineNumberBg: RGBA
  diffRemovedLineNumberBg: RGBA
  markdownText: RGBA
  markdownHeading: RGBA
  markdownLink: RGBA
  markdownLinkText: RGBA
  markdownCode: RGBA
  markdownBlockQuote: RGBA
  markdownEmph: RGBA
  markdownStrong: RGBA
  markdownHorizontalRule: RGBA
  markdownListItem: RGBA
  markdownListEnumeration: RGBA
  markdownImage: RGBA
  markdownImageText: RGBA
  markdownCodeBlock: RGBA
  syntaxComment: RGBA
  syntaxKeyword: RGBA
  syntaxFunction: RGBA
  syntaxVariable: RGBA
  syntaxString: RGBA
  syntaxNumber: RGBA
  syntaxType: RGBA
  syntaxOperator: RGBA
  syntaxPunctuation: RGBA
}

type HexColor = `#${string}`
type RefName = string
type Variant = {
  dark: HexColor | RefName
  light: HexColor | RefName
}
type ColorValue = HexColor | RefName | Variant
type ThemeJson = {
  $schema?: string
  defs?: Record<string, HexColor | RefName>
  theme: Record<keyof Theme, ColorValue>
}

export const THEMES: Record<string, ThemeJson> = {
  aura,
  ayu,
  catppuccin,
  cobalt2,
  dracula,
  everforest,
  github,
  gruvbox,
  kanagawa,
  material,
  matrix,
  monokai,
  nord,
  ["one-dark"]: onedark,
  opencode,
  palenight,
  rosepine,
  solarized,
  synthwave84,
  tokyonight,
  vesper,
  zenburn,
}

function resolveTheme(theme: ThemeJson, mode: "dark" | "light") {
  const defs = theme.defs ?? {}
  function resolveColor(c: ColorValue): RGBA {
    if (typeof c === "string") return c.startsWith("#") ? RGBA.fromHex(c) : resolveColor(defs[c])
    return resolveColor(c[mode])
  }
  return Object.fromEntries(
    Object.entries(theme.theme).map(([key, value]) => {
      return [key, resolveColor(value)]
    }),
  ) as Theme
}

export const { use: useTheme, provider: ThemeProvider } = createSimpleContext({
  name: "Theme",
  init: (props: { mode: "dark" | "light" }) => {
    const sync = useSync()
    const kv = useKV()
    const toast = useToast()

    const [theme, setTheme] = createSignal(sync.data.config.theme ?? kv.get("theme", "opencode"))
    const [mode, setMode] = createSignal(props.mode)
    const [customThemes, setCustomThemes] = createSignal<Record<string, Theme>>()

    // Load custom themes in the background
    createEffect(async () => {
      const customThemes: Record<string, Theme> = {}
      for (const configDir of await Config.directories()) {
        for await (const themeFile of new Bun.Glob("themes/*.json").scan({ cwd: configDir, absolute: true })) {
          const themeName = path.basename(themeFile, ".json")
          const theme = await iife(
            async () => {
              return await Bun.file(themeFile).json()
                .catch(e => {
                  toast.show({
                    variant: "error",
                    message: `Failed to load theme ${themeName}: ${e.message}`,
                  })
                })
            }
          )
          if (!theme) continue
          if (THEMES[themeName])
            toast.show({
              variant: "warning",
              message: `Custom theme '${themeName}' is overriding built-in theme of same name`,
            })
          else if (customThemes[themeName])
            toast.show({
              variant: "warning",
              message: `Multiple custom themes named '${themeName}' are defined`,
            })
          customThemes[themeName] = resolveTheme(theme as ThemeJson, mode())
        }
      }
      setCustomThemes(customThemes)
    })

    const allThemes = createMemo(() => {
      return { ...THEMES, ...customThemes() }
    })

    const selectedThemeDef = createMemo(() => {
      const selected = theme()
      return customThemes()?.[selected] ?? resolveTheme(THEMES[theme()] ?? THEMES.opencode, mode())
    })

    const syntax = createMemo(() => {
      return SyntaxStyle.fromTheme([
        {
          scope: ["prompt"],
          style: {
            foreground: selectedThemeDef().accent,
          },
        },
        {
          scope: ["extmark.file"],
          style: {
            foreground: selectedThemeDef().warning,
            bold: true,
          },
        },
        {
          scope: ["extmark.agent"],
          style: {
            foreground: selectedThemeDef().secondary,
            bold: true,
          },
        },
        {
          scope: ["extmark.paste"],
          style: {
            foreground: selectedThemeDef().background,
            background: selectedThemeDef().warning,
            bold: true,
          },
        },
        {
          scope: ["comment"],
          style: {
            foreground: selectedThemeDef().syntaxComment,
            italic: true,
          },
        },
        {
          scope: ["comment.documentation"],
          style: {
            foreground: selectedThemeDef().syntaxComment,
            italic: true,
          },
        },
        {
          scope: ["string", "symbol"],
          style: {
            foreground: selectedThemeDef().syntaxString,
          },
        },
        {
          scope: ["number", "boolean"],
          style: {
            foreground: selectedThemeDef().syntaxNumber,
          },
        },
        {
          scope: ["character.special"],
          style: {
            foreground: selectedThemeDef().syntaxString,
          },
        },
        {
          scope: ["keyword.return", "keyword.conditional", "keyword.repeat", "keyword.coroutine"],
          style: {
            foreground: selectedThemeDef().syntaxKeyword,
            italic: true,
          },
        },
        {
          scope: ["keyword.type"],
          style: {
            foreground: selectedThemeDef().syntaxType,
            bold: true,
            italic: true,
          },
        },
        {
          scope: ["keyword.function", "function.method"],
          style: {
            foreground: selectedThemeDef().syntaxFunction,
          },
        },
        {
          scope: ["keyword"],
          style: {
            foreground: selectedThemeDef().syntaxKeyword,
            italic: true,
          },
        },
        {
          scope: ["keyword.import"],
          style: {
            foreground: selectedThemeDef().syntaxKeyword,
          },
        },
        {
          scope: ["operator", "keyword.operator", "punctuation.delimiter"],
          style: {
            foreground: selectedThemeDef().syntaxOperator,
          },
        },
        {
          scope: ["keyword.conditional.ternary"],
          style: {
            foreground: selectedThemeDef().syntaxOperator,
          },
        },
        {
          scope: ["variable", "variable.parameter", "function.method.call", "function.call"],
          style: {
            foreground: selectedThemeDef().syntaxVariable,
          },
        },
        {
          scope: ["variable.member", "function", "constructor"],
          style: {
            foreground: selectedThemeDef().syntaxFunction,
          },
        },
        {
          scope: ["type", "module"],
          style: {
            foreground: selectedThemeDef().syntaxType,
          },
        },
        {
          scope: ["constant"],
          style: {
            foreground: selectedThemeDef().syntaxNumber,
          },
        },
        {
          scope: ["property"],
          style: {
            foreground: selectedThemeDef().syntaxVariable,
          },
        },
        {
          scope: ["class"],
          style: {
            foreground: selectedThemeDef().syntaxType,
          },
        },
        {
          scope: ["parameter"],
          style: {
            foreground: selectedThemeDef().syntaxVariable,
          },
        },
        {
          scope: ["punctuation", "punctuation.bracket"],
          style: {
            foreground: selectedThemeDef().syntaxPunctuation,
          },
        },
        {
          scope: [
            "variable.builtin",
            "type.builtin",
            "function.builtin",
            "module.builtin",
            "constant.builtin",
          ],
          style: {
            foreground: selectedThemeDef().error,
          },
        },
        {
          scope: ["variable.super"],
          style: {
            foreground: selectedThemeDef().error,
          },
        },
        {
          scope: ["string.escape", "string.regexp"],
          style: {
            foreground: selectedThemeDef().syntaxKeyword,
          },
        },
        {
          scope: ["keyword.directive"],
          style: {
            foreground: selectedThemeDef().syntaxKeyword,
            italic: true,
          },
        },
        {
          scope: ["punctuation.special"],
          style: {
            foreground: selectedThemeDef().syntaxOperator,
          },
        },
        {
          scope: ["keyword.modifier"],
          style: {
            foreground: selectedThemeDef().syntaxKeyword,
            italic: true,
          },
        },
        {
          scope: ["keyword.exception"],
          style: {
            foreground: selectedThemeDef().syntaxKeyword,
            italic: true,
          },
        },
        // Markdown specific styles
        {
          scope: ["markup.heading"],
          style: {
            foreground: selectedThemeDef().markdownHeading,
            bold: true,
          },
        },
        {
          scope: ["markup.heading.1"],
          style: {
            foreground: selectedThemeDef().markdownHeading,
            bold: true,
          },
        },
        {
          scope: ["markup.heading.2"],
          style: {
            foreground: selectedThemeDef().markdownHeading,
            bold: true,
          },
        },
        {
          scope: ["markup.heading.3"],
          style: {
            foreground: selectedThemeDef().markdownHeading,
            bold: true,
          },
        },
        {
          scope: ["markup.heading.4"],
          style: {
            foreground: selectedThemeDef().markdownHeading,
            bold: true,
          },
        },
        {
          scope: ["markup.heading.5"],
          style: {
            foreground: selectedThemeDef().markdownHeading,
            bold: true,
          },
        },
        {
          scope: ["markup.heading.6"],
          style: {
            foreground: selectedThemeDef().markdownHeading,
            bold: true,
          },
        },
        {
          scope: ["markup.bold", "markup.strong"],
          style: {
            foreground: selectedThemeDef().markdownStrong,
            bold: true,
          },
        },
        {
          scope: ["markup.italic"],
          style: {
            foreground: selectedThemeDef().markdownEmph,
            italic: true,
          },
        },
        {
          scope: ["markup.list"],
          style: {
            foreground: selectedThemeDef().markdownListItem,
          },
        },
        {
          scope: ["markup.quote"],
          style: {
            foreground: selectedThemeDef().markdownBlockQuote,
            italic: true,
          },
        },
        {
          scope: ["markup.raw", "markup.raw.block"],
          style: {
            foreground: selectedThemeDef().markdownCode,
          },
        },
        {
          scope: ["markup.raw.inline"],
          style: {
            foreground: selectedThemeDef().markdownCode,
            background: selectedThemeDef().background,
          },
        },
        {
          scope: ["markup.link"],
          style: {
            foreground: selectedThemeDef().markdownLink,
            underline: true,
          },
        },
        {
          scope: ["markup.link.label"],
          style: {
            foreground: selectedThemeDef().markdownLinkText,
            underline: true,
          },
        },
        {
          scope: ["markup.link.url"],
          style: {
            foreground: selectedThemeDef().markdownLink,
            underline: true,
          },
        },
        {
          scope: ["label"],
          style: {
            foreground: selectedThemeDef().markdownLinkText,
          },
        },
        {
          scope: ["spell", "nospell"],
          style: {
            foreground: selectedThemeDef().text,
          },
        },
        {
          scope: ["conceal"],
          style: {
            foreground: selectedThemeDef().textMuted,
          },
        },
        // Additional common highlight groups
        {
          scope: ["string.special", "string.special.url"],
          style: {
            foreground: selectedThemeDef().markdownLink,
            underline: true,
          },
        },
        {
          scope: ["character"],
          style: {
            foreground: selectedThemeDef().syntaxString,
          },
        },
        {
          scope: ["float"],
          style: {
            foreground: selectedThemeDef().syntaxNumber,
          },
        },
        {
          scope: ["comment.error"],
          style: {
            foreground: selectedThemeDef().error,
            italic: true,
            bold: true,
          },
        },
        {
          scope: ["comment.warning"],
          style: {
            foreground: selectedThemeDef().warning,
            italic: true,
            bold: true,
          },
        },
        {
          scope: ["comment.todo", "comment.note"],
          style: {
            foreground: selectedThemeDef().info,
            italic: true,
            bold: true,
          },
        },
        {
          scope: ["namespace"],
          style: {
            foreground: selectedThemeDef().syntaxType,
          },
        },
        {
          scope: ["field"],
          style: {
            foreground: selectedThemeDef().syntaxVariable,
          },
        },
        {
          scope: ["type.definition"],
          style: {
            foreground: selectedThemeDef().syntaxType,
            bold: true,
          },
        },
        {
          scope: ["keyword.export"],
          style: {
            foreground: selectedThemeDef().syntaxKeyword,
          },
        },
        {
          scope: ["attribute", "annotation"],
          style: {
            foreground: selectedThemeDef().warning,
          },
        },
        {
          scope: ["tag"],
          style: {
            foreground: selectedThemeDef().error,
          },
        },
        {
          scope: ["tag.attribute"],
          style: {
            foreground: selectedThemeDef().syntaxKeyword,
          },
        },
        {
          scope: ["tag.delimiter"],
          style: {
            foreground: selectedThemeDef().syntaxOperator,
          },
        },
        {
          scope: ["markup.strikethrough"],
          style: {
            foreground: selectedThemeDef().textMuted,
          },
        },
        {
          scope: ["markup.underline"],
          style: {
            foreground: selectedThemeDef().text,
            underline: true,
          },
        },
        {
          scope: ["markup.list.checked"],
          style: {
            foreground: selectedThemeDef().success,
          },
        },
        {
          scope: ["markup.list.unchecked"],
          style: {
            foreground: selectedThemeDef().textMuted,
          },
        },
        {
          scope: ["diff.plus"],
          style: {
            foreground: selectedThemeDef().diffAdded,
          },
        },
        {
          scope: ["diff.minus"],
          style: {
            foreground: selectedThemeDef().diffRemoved,
          },
        },
        {
          scope: ["diff.delta"],
          style: {
            foreground: selectedThemeDef().diffContext,
          },
        },
        {
          scope: ["error"],
          style: {
            foreground: selectedThemeDef().error,
            bold: true,
          },
        },
        {
          scope: ["warning"],
          style: {
            foreground: selectedThemeDef().warning,
            bold: true,
          },
        },
        {
          scope: ["info"],
          style: {
            foreground: selectedThemeDef().info,
          },
        },
        {
          scope: ["debug"],
          style: {
            foreground: selectedThemeDef().textMuted,
          },
        },
      ])
    })

    return {
      theme: new Proxy(selectedThemeDef(), {
        get(_target, prop) {
          return selectedThemeDef()[prop as keyof Theme]
        },
      }),
      get selected() {
        return theme()
      },
      syntax,
      mode,
      setMode(mode: "dark" | "light") {
        setMode(mode)
      },
      set(theme: string) {
        if (!this.all[theme]) return
        setTheme(theme)
        kv.set("theme", theme)
      },
      get ready() {
        return sync.ready
      },
      get all() {
        return allThemes()
      }
    }
  },
})
