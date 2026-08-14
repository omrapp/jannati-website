-- Follow-up to 20260814000001: `revoke all ... from public` alone did not
-- lock out `anon`/`authenticated` — Supabase's project-level default
-- privileges grant `execute` on new `public`-schema functions to those
-- roles directly at creation time, which is a separate grant from `public`
-- (the pseudo-role) and survives a `revoke ... from public`. Verified live:
-- the anon key could call `merge_guest_cart_into_customer` and get a clean
-- 204, no permission error. Revoke from the actual roles explicitly.
revoke execute on function public.merge_guest_cart_into_customer(uuid, text) from anon;
revoke execute on function public.merge_guest_cart_into_customer(uuid, text) from authenticated;
