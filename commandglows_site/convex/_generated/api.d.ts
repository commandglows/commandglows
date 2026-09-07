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
import type * as commerceAlerts from '../commerceAlerts.js'
import type * as commerceEmail from '../commerceEmail.js'
import type * as commerceEventContract from '../commerceEventContract.js'
import type * as commerceIncidentLedger from '../commerceIncidentLedger.js'
import type * as commerceOperations from '../commerceOperations.js'
import type * as commerceOperationsSchema from '../commerceOperationsSchema.js'
import type * as commerceProcessor from '../commerceProcessor.js'
import type * as commercePurchaseState from '../commercePurchaseState.js'
import type * as crons from '../crons.js'
import type * as defaultFreeEntitlements from '../defaultFreeEntitlements.js'
import type * as email from '../email.js'
import type * as emailAcceptance from '../emailAcceptance.js'
import type * as emailCampaignPolicy from '../emailCampaignPolicy.js'
import type * as emailCampaignSchema from '../emailCampaignSchema.js'
import type * as emailCampaigns from '../emailCampaigns.js'
import type * as emailConfig from '../emailConfig.js'
import type * as emailDelivery from '../emailDelivery.js'
import type * as emailLegacySchema from '../emailLegacySchema.js'
import type * as emailOperations from '../emailOperations.js'
import type * as emailOperationsPolicy from '../emailOperationsPolicy.js'
import type * as emailOperationsSchema from '../emailOperationsSchema.js'
import type * as emailSchema from '../emailSchema.js'
import type * as features from '../features.js'
import type * as http from '../http.js'
import type * as licenseAdministration from '../licenseAdministration.js'
import type * as productEntitlementPolicies from '../productEntitlementPolicies.js'
import type * as resend from '../resend.js'
import type * as siteAuthority from '../siteAuthority.js'
import type * as siteIdentity from '../siteIdentity.js'
import type * as siteSessions from '../siteSessions.js'
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
  commerceAlerts: typeof commerceAlerts
  commerceEmail: typeof commerceEmail
  commerceEventContract: typeof commerceEventContract
  commerceIncidentLedger: typeof commerceIncidentLedger
  commerceOperations: typeof commerceOperations
  commerceOperationsSchema: typeof commerceOperationsSchema
  commerceProcessor: typeof commerceProcessor
  commercePurchaseState: typeof commercePurchaseState
  crons: typeof crons
  defaultFreeEntitlements: typeof defaultFreeEntitlements
  email: typeof email
  emailAcceptance: typeof emailAcceptance
  emailCampaignPolicy: typeof emailCampaignPolicy
  emailCampaignSchema: typeof emailCampaignSchema
  emailCampaigns: typeof emailCampaigns
  emailConfig: typeof emailConfig
  emailDelivery: typeof emailDelivery
  emailLegacySchema: typeof emailLegacySchema
  emailOperations: typeof emailOperations
  emailOperationsPolicy: typeof emailOperationsPolicy
  emailOperationsSchema: typeof emailOperationsSchema
  emailSchema: typeof emailSchema
  features: typeof features
  http: typeof http
  licenseAdministration: typeof licenseAdministration
  productEntitlementPolicies: typeof productEntitlementPolicies
  resend: typeof resend
  siteAuthority: typeof siteAuthority
  siteIdentity: typeof siteIdentity
  siteSessions: typeof siteSessions
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
