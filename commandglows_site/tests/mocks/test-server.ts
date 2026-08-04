import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const mswServer = setupServer(...handlers)

// Configuration globale pour les tests
export function setupMswServer() {
  beforeAll(() => {
    mswServer.listen({ onUnhandledRequest: 'error' })
  })

  afterEach(() => {
    mswServer.resetHandlers()
  })

  afterAll(() => {
    mswServer.close()
  })
} 