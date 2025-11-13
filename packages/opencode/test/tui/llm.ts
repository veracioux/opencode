import type { Mock } from "bun:test"
import { Hono } from "hono"

class MockLLMServer {
  private server: ReturnType<typeof Bun.serve> | null = null
  private app: Hono
  private hostname: string
  private port: number

  respond: Mock<(requestBody: object) => any>

  constructor(options: { hostname: string; port: number; respond: Mock<(requestBody: object) => Promise<any>> }) {
    this.hostname = options.hostname
    this.port = options.port
    this.respond = options.respond
    this.app = new Hono()
    this.app.post("/v1/chat/completions", async (c) => {
      const body = await c.req.json()
      const response = await this.respond(body)
      return c.json(response)
    })
  }

  get url() {
    const url = this.server?.url.toString()
    return url ? url + "/v1" : url
  }

  listen() {
    this.server = Bun.serve({
      hostname: this.hostname,
      port: this.port,
      fetch: this.app.fetch,
    })
  }

  stop() {
    if (this.server) {
      this.server.stop()
    }
  }
}

export { MockLLMServer }
