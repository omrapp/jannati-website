'use server';

import { z } from 'zod';

import { submitContactMessage } from '@/lib/admin/contact-messages';
import { createClient } from '@/lib/supabase/server';

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const s = typeof value === 'string' ? value.trim() : '';
  return s.length > 0 ? s : null;
}

const contactSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().max(50).nullable(),
  message: z.string().trim().min(1).max(5000),
});

export type ContactFormState = { status: 'idle' | 'error' | 'success'; message?: string };

export const idleContactFormState: ContactFormState = { status: 'idle' };

export async function submitContact(_prevState: ContactFormState, formData: FormData): Promise<ContactFormState> {
  // Honeypot: a real visitor never fills this field in (it's visually
  // hidden, see `ContactForm`). A bot filling every input does — treated as
  // spam and dropped silently, reporting success so it learns nothing.
  if (emptyToNull(formData.get('website'))) {
    return { status: 'success', message: 'sent' };
  }

  const parsed = contactSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    phone: emptyToNull(formData.get('phone')),
    message: formData.get('message'),
  });
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  try {
    const client = await createClient();
    await submitContactMessage(client, parsed.data);
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Send failed.' };
  }

  return { status: 'success', message: 'sent' };
}
