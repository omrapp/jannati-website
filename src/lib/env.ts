import { z } from 'zod';

/**
 * Fails fast at startup rather than at the first query when configuration is
 * missing. Public values are inlined by Next at build time, so they must be
 * referenced as full `process.env.NEXT_PUBLIC_*` expressions.
 */
const schema = z.object({
  supabaseUrl: z.url(),
  supabaseAnonKey: z.string().min(1),
  supabaseServiceRoleKey: z.string().min(1).optional(),
  siteUrl: z.url(),
  // Signs the guest cart session cookie (`src/lib/commerce/session.ts`).
  // Optional here, same as the service-role key — required only where it's
  // actually used, so pages that never touch a cart still build without it.
  cartSessionSecret: z.string().min(32).optional(),
  // 2.11/2.12: unset until real merchant accounts exist (see tasks/todo.md).
  // Optional so the app still builds/runs with neither provider live — each
  // adapter throws its own clear config error only when actually called.
  thawaniSecretKey: z.string().min(1).optional(),
  thawaniPublishableKey: z.string().min(1).optional(),
  thawaniEnv: z.enum(['uat', 'production']).default('uat'),
  tapSecretKey: z.string().min(1).optional(),
  // 4.3: same posture as the payment keys above — unset until the user
  // supplies real Resend/Twilio credentials, so each adapter throws its own
  // config error only when actually called rather than failing the build.
  resendApiKey: z.string().min(1).optional(),
  resendFromEmail: z.email().default('orders@jannati.om'),
  twilioAccountSid: z.string().min(1).optional(),
  twilioAuthToken: z.string().min(1).optional(),
  twilioMessagingServiceSid: z.string().min(1).optional(),
});

export const env = schema.parse({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  cartSessionSecret: process.env.CART_SESSION_SECRET,
  // `|| undefined`, not a plain pass-through: an unset-but-present env var
  // (e.g. a blank placeholder line in `.env.local`) is `''`, which fails
  // `.min(1)` even though the field is `.optional()` — Zod's "optional"
  // only means "key may be absent," not "empty string is treated as
  // absent." Same normalization all four new keys need.
  thawaniSecretKey: process.env.THAWANI_SECRET_KEY || undefined,
  thawaniPublishableKey: process.env.THAWANI_PUBLISHABLE_KEY || undefined,
  // Any value other than the literal 'production' stays 'uat' — a typo'd
  // or stray placeholder value in `.env.local` should never fail the build
  // over what is, until 2.11 is unblocked, a dead code path either way.
  thawaniEnv: process.env.THAWANI_ENV === 'production' ? 'production' : 'uat',
  tapSecretKey: process.env.TAP_SECRET_KEY || undefined,
  resendApiKey: process.env.RESEND_API_KEY || undefined,
  resendFromEmail: process.env.RESEND_FROM_EMAIL || undefined,
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || undefined,
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || undefined,
  twilioMessagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID || undefined,
});
