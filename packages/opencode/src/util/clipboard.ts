import { $ } from "bun"
import { platform } from "os"
import clipboardy from "clipboardy"

export namespace Clipboard {
  export interface Content {
    data: string
    mime: string
  }

  export async function read(): Promise<Content | undefined> {
    const os = platform()

    if (os === "darwin") {
      const imageBuffer = await $`osascript -e 'try' -e 'the clipboard as «class PNGf»' -e 'end try'`.nothrow().text()
      if (imageBuffer) {
        return { data: Buffer.from(imageBuffer).toString("base64url"), mime: "image/png" }
      }
    }

    if (os === "linux") {
      const wayland = await $`wl-paste -t image/png`.nothrow().text()
      if (wayland) {
        return { data: Buffer.from(wayland).toString("base64url"), mime: "image/png" }
      }
      const x11 = await $`xclip -selection clipboard -t image/png -o`.nothrow().text()
      if (x11) {
        return { data: Buffer.from(x11).toString("base64url"), mime: "image/png" }
      }
    }

    if (os === "win32") {
      const script =
        "Add-Type -AssemblyName System.Windows.Forms; $img = [System.Windows.Forms.Clipboard]::GetImage(); if ($img) { $ms = New-Object System.IO.MemoryStream; $img.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png); [System.Convert]::ToBase64String($ms.ToArray()) }"
      const base64 = await $`powershell -command "${script}"`.nothrow().text()
      if (base64) {
        const imageBuffer = Buffer.from(base64.trim(), "base64")
        if (imageBuffer.length > 0) {
          return { data: imageBuffer.toString("base64url"), mime: "image/png" }
        }
      }
    }

    const text = await clipboardy.read().catch(() => {})
    if (text) {
      return { data: text, mime: "text/plain" }
    }
  }
}
