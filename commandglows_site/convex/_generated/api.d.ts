/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from 'convex/server'
import type * as apiKeys from '../apiKeys.js'
import type * as bridge from '../bridge.js'
import type * as crons from '../crons.js'
import type * as defaultFreeEntitlements from '../defaultFreeEntitlements.js'
import type * as email from '../email.js'
import type * as emailConfig from '../emailConfig.js'
import type * as emailDelivery from '../emailDelivery.js'
import type * as emailSchema from '../emailSchema.js'
import type * as features from '../features.js'
import type * as http from '../http.js'
import type * as licenseAdministration from '../licenseAdministration.js'
import type * as productEntitlementPolicies from '../productEntitlementPolicies.js'
import type * as resend from '../resend.js'
import type * as users from '../users.js'

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  apiKeys: typeof apiKeys
  bridge: typeof bridge
  crons: typeof crons
  defaultFreeEntitlements: typeof defaultFreeEntitlements
  email: typeof email
  emailConfig: typeof emailConfig
  emailDelivery: typeof emailDelivery
  emailSchema: typeof emailSchema
  features: typeof features
  http: typeof http
  licenseAdministration: typeof licenseAdministration
  productEntitlementPolicies: typeof productEntitlementPolicies
  resend: typeof resend
  users: typeof users
}>
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, 'public'>
>
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, 'internal'>
>
export declare const components: {}
