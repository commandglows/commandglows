import { describe, expect, it } from 'vitest'
import { parseFirebaseBridgeRequest } from '../../src/lib/firebaseBridgeRequest'

describe('Firebase bridge request', () => {
  it('preserves first-trial and restart actions', () => {
    expect(parseFirebaseBridgeRequest({ trialAction: 'start' })).toEqual({
      trialAction: 'start',
    })
    expect(parseFirebaseBridgeRequest({ trialAction: 'restart' })).toEqual({
      trialAction: 'restart',
    })
  })

  it('ignores unknown or malformed trial actions', () => {
    expect(parseFirebaseBridgeRequest({ trialAction: 'grant' })).toEqual({})
    expect(parseFirebaseBridgeRequest(null)).toEqual({})
    expect(parseFirebaseBridgeRequest('start')).toEqual({})
  })
})
