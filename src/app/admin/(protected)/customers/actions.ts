'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { checkAdminAccess } from '@/lib/admin/auth';
import { blockCheckout, blockLogin, deleteCustomerAccount, unblock } from '@/lib/admin/customers';
import { createAdminClient } from '@/lib/supabase/admin';

function reasonFromFormData(formData: FormData): string | null {
  const raw = formData.get('reason');
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Bound as `blockCustomerLogin.bind(null, customerId)` on a `<form>` whose
 * only field is the optional `reason` text input — same bound-action shape
 * as `delete-banner-button.tsx`, just with a `formData` param since this one
 * needs to read that field.
 */
export async function blockCustomerLogin(customerId: string, formData: FormData): Promise<void> {
  const access = await checkAdminAccess();
  if (!access.isAdmin) throw new Error('Not authorized.');

  await blockLogin(createAdminClient(), customerId, reasonFromFormData(formData));
  revalidatePath('/admin/customers');
  revalidatePath(`/admin/customers/${customerId}`);
}

export async function blockCustomerCheckout(customerId: string, formData: FormData): Promise<void> {
  const access = await checkAdminAccess();
  if (!access.isAdmin) throw new Error('Not authorized.');

  await blockCheckout(createAdminClient(), customerId, reasonFromFormData(formData));
  revalidatePath('/admin/customers');
  revalidatePath(`/admin/customers/${customerId}`);
}

export async function unblockCustomer(customerId: string, which: 'login' | 'checkout' | 'both'): Promise<void> {
  const access = await checkAdminAccess();
  if (!access.isAdmin) throw new Error('Not authorized.');

  await unblock(createAdminClient(), customerId, which);
  revalidatePath('/admin/customers');
  revalidatePath(`/admin/customers/${customerId}`);
}

export async function deleteCustomer(customerId: string): Promise<void> {
  const access = await checkAdminAccess();
  if (!access.isAdmin) throw new Error('Not authorized.');

  await deleteCustomerAccount(createAdminClient(), customerId);
  redirect('/admin/customers');
}
