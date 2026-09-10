import { describe, expect, test } from 'vitest'
import { siteAuthContentSecurityPolicy } from '@/lib/auth/siteAuthCsp'
describe('OIDC form redirect policy', () => {
 test('preserves every directive except exact configured form destination', () => {
  const baseline=siteAuthContentSecurityPolicy()
  const configured=siteAuthContentSecurityPolicy('https://identity.example.test/')
  const before=new Map(baseline.split(';').filter(Boolean).map(v=>{const [k,...s]=v.trim().split(/\s+/);return [k,s]}))
  const after=new Map(configured.split(';').filter(Boolean).map(v=>{const [k,...s]=v.trim().split(/\s+/);return [k,s]}))
  for(const [key,value] of before) expect(after.get(key)).toEqual(key==='form-action'?[...value,'https://identity.example.test']:value)
  expect(configured).not.toContain('https://*.auth0.com')
 })
 test.each(['http://identity.example','https://identity.example/extra','https://user:pass@identity.example/','https://identity.example/?url=evil'])('rejects non-issuer values %s', issuer=>expect(()=>siteAuthContentSecurityPolicy(issuer)).toThrow())
})
