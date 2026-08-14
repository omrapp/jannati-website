/**
 * Shared shape for every auth form's `useActionState`. One field, one
 * meaning: either nothing has happened yet, or the last submit produced
 * this human-readable status — already translated, never a raw error object.
 */
export type AuthActionState = {
  status: 'idle' | 'error' | 'success';
  message?: string;
};

export const idleAuthState: AuthActionState = { status: 'idle' };
