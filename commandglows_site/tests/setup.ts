import { vi, beforeAll, afterAll, afterEach } from 'vitest'
import { preview } from 'vite'
import type { PreviewServer } from 'vite'

declare global {
  var BASE_URL: string
}
global.BASE_URL = 'http://localhost:4321'

let viteServer: PreviewServer

export async function startTestServer() {
  viteServer = await preview()
  return viteServer
}

export async function stopTestServer() {
  if (viteServer) {
    await viteServer.httpServer.close()
  }
}

beforeAll(async () => {
  await startTestServer()
})

afterAll(async () => {
  await stopTestServer()
})

afterEach(() => {
  vi.clearAllMocks()
})
