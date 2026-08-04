import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
import './mocks/i18n'
import { mswServer } from './mocks/test-server'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')

// Charger les variables d'environnement de test
config({ path: path.join(rootDir, '.env.test') })

export async function startTestServer() {
  mswServer.listen({ onUnhandledRequest: 'error' })
  return mswServer
}

export async function stopTestServer() {
  mswServer.close()
}

export { mswServer } 