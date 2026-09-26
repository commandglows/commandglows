import { readAuth0Config } from './auth0Session'
import { siteBackend } from './siteAuth'
import { getServerEnv } from '../serverEnv'

/** Keep dashboard affordances aligned with the guarded recovery route. */
export function isAccountRecoveryAvailable(origin: string, authUnavailable: boolean | undefined) {
  try {
    const config = readAuth0Config(getServerEnv())
    siteBackend()
    return config.origin === origin && !authUnavailable
  } catch {
    return false
  }
}
