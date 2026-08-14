import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // `src/lib/env` validates at import time. Unit tests never reach Supabase,
    // but they do import modules that read these, so give them stand-ins.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      CART_SESSION_SECRET: 'test-cart-session-secret-at-least-32-chars',
    },
  },
});
