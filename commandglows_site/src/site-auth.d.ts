import type { SiteAuth } from './lib/auth/siteAuth'
declare global {
  namespace App {
    interface Locals { siteAuth: () => SiteAuth }
  }
}
export {}
