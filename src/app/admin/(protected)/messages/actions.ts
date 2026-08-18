'use server';

import { revalidatePath } from 'next/cache';

import { checkAdminAccess } from '@/lib/admin/auth';
import { deleteContactMessage, markContactMessageRead } from '@/lib/admin/contact-messages';
import { createClient } from '@/lib/supabase/server';

export async function markMessageReadAction(messageId: string, isRead: boolean): Promise<void> {
  const access = await checkAdminAccess();
  if (!access.isAdmin) throw new Error('Not authorized.');

  await markContactMessageRead(await createClient(), messageId, isRead);
  revalidatePath('/admin/messages');
}

export async function deleteMessageAction(messageId: string): Promise<void> {
  const access = await checkAdminAccess();
  if (!access.isAdmin) throw new Error('Not authorized.');

  await deleteContactMessage(await createClient(), messageId);
  revalidatePath('/admin/messages');
}
