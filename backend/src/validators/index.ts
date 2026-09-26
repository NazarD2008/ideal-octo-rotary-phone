import { z } from 'zod';
import { ValidationError } from '../errors/index.js';
import { LIMITS, PATTERNS } from '../constants/index.js';

/** Schema for user authentication */
export const loginSchema = z.object({
  username: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
});

/** Schema for user creation/update */
export const userSchema = z.object({
  username: z
    .string()
    .min(LIMITS.MIN_USERNAME_LENGTH, `Username must be at least ${LIMITS.MIN_USERNAME_LENGTH} characters`)
    .max(LIMITS.MAX_USERNAME_LENGTH, `Username must be at most ${LIMITS.MAX_USERNAME_LENGTH} characters`)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z
    .string()
    .email('Invalid email format')
    .max(LIMITS.MAX_EMAIL_LENGTH, `Email must be at most ${LIMITS.MAX_EMAIL_LENGTH} characters`),
  password: z
    .string()
    .min(LIMITS.MIN_PASSWORD_LENGTH, `Password must be at least ${LIMITS.MIN_PASSWORD_LENGTH} characters`)
    .max(LIMITS.MAX_PASSWORD_LENGTH, `Password must be at most ${LIMITS.MAX_PASSWORD_LENGTH} characters`)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one digit')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
    .optional(),
  role: z.enum(['admin', 'user']).optional(),
  permissions: z.array(z.string()).optional(),
});

/** Schema for device ID validation */
export const deviceIdSchema = z
  .string()
  .min(1, 'Device ID is required')
  .max(128, 'Device ID is too long')
  .regex(PATTERNS.DEVICE_ID, 'Invalid device ID format');

/** Schema for session ID validation */
export const sessionIdSchema = z
  .string()
  .min(1, 'Session ID is required')
  .max(128, 'Session ID is too long')
  .regex(PATTERNS.SESSION_ID, 'Invalid session ID format');

/** Schema for command payloads */
export const commandSchema = z.object({
  type: z.string(),
  action: z.string().optional(),
  sessionId: sessionIdSchema.optional(),
  data: z.unknown().optional(),
});

/** Schema for file transfer validation */
export const fileTransferSchema = z.object({
  transferId: z.string(),
  name: z.string(),
  channel: z.string(),
  totalChunks: z.number().int().positive().max(LIMITS.MAX_TOTAL_CHUNKS),
  totalSize: z.number().int().nonnegative(),
});

/** Schema for WebRTC offer validation */
export const webrtcOfferSchema = z.object({
  sdp: z.string().max(LIMITS.MAX_SDP_LENGTH, 'SDP too large'),
  iceServers: z.array(z.object({
    urls: z.string(),
    username: z.string().optional(),
    credential: z.string().optional(),
  })).min(1, 'At least one ICE server required').max(LIMITS.MAX_ICE_SERVERS, 'Too many ICE servers'),
});

/** Schema for ICE candidate validation */
export const iceCandidateSchema = z.object({
  candidate: z.string().max(LIMITS.MAX_ICE_CANDIDATE_LENGTH, 'ICE candidate too large'),
});

/** Schema for build request validation */
export const buildRequestSchema = z.object({
  serverUrl: z.string().url('Invalid server URL'),
  homePageUrl: z.string().url('Invalid home page URL'),
  appName: z.string().max(LIMITS.MAX_APP_NAME_LENGTH, 'App name too long'),
  icon: z.instanceof(Buffer).optional(),
});

/** Schema for pagination parameters */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/** Type exports */
export type LoginInput = z.infer<typeof loginSchema>;
export type UserInput = z.infer<typeof userSchema>;
export type DeviceIdInput = z.infer<typeof deviceIdSchema>;
export type SessionIdInput = z.infer<typeof sessionIdSchema>;
export type CommandInput = z.infer<typeof commandSchema>;
export type FileTransferInput = z.infer<typeof fileTransferSchema>;
export type WebRTCOfferInput = z.infer<typeof webrtcOfferSchema>;
export type IceCandidateInput = z.infer<typeof iceCandidateSchema>;
export type BuildRequestInput = z.infer<typeof buildRequestSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;

/** Validation helper */
export function validate<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  return schema.parse(data);
}

/** Safe validation that returns errors instead of throwing */
export function safeValidate<T extends z.ZodType>(schema: T, data: unknown): { success: boolean; data?: z.infer<T>; error?: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
