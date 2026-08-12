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
});

export const env = schema.parse({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
});
