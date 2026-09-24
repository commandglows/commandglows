export * from './messageContract'

// Compatibility exports; provider composition lives outside worker orchestration.
export {
  sendPostmark,
  createPostmarkTransport,
  type PostmarkOptions,
} from './transports/postmark'
export { createCaptureTransport } from './transports/capture'
