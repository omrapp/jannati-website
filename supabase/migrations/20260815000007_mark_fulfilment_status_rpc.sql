-- Atomic, race-safe fulfilment-status transition for the admin order-detail
-- page (Task 3.5). Same shape as `mark_payment_status`
-- (`20260815000002_mark_payment_status_rpc.sql`) — see that file's comment
-- for the race it closes; here the race is two staff members (or one
-- double-clicking) transitioning the same order concurrently, not competing
-- webhook deliveries, but the fix is the same: the `where` clause is the
-- atomic guard, checked against the row's committed state under lock, not a
-- prior JS read. Mirrors `isAllowedFulfilmentTransition`
-- (`src/lib/commerce/fulfilment.ts`) exactly; keep both in sync.
--
-- Unlike `mark_payment_status`, `p_created_by` is never null here — every
-- call is a staff action, not a system/webhook event, so `order_events.
-- created_by` always records who made the change.
create or replace function public.mark_fulfilment_status(
  p_order_id uuid,
  p_status public.fulfilment_status,
  p_note text,
  p_created_by uuid
)
returns boolean -- true if applied, false if this transition was rejected or already applied
language plpgsql
security definer
set search_path = public
as $$
declare
  v_applied boolean := false;
begin
  update public.orders
  set fulfilment_status = p_status
  where id = p_order_id
    and (
      (fulfilment_status = 'pending' and p_status in ('processing', 'cancelled'))
      or (fulfilment_status = 'processing' and p_status in ('shipped', 'cancelled'))
      or (fulfilment_status = 'shipped' and p_status = 'delivered')
    )
  returning true into v_applied;

  if v_applied then
    insert into public.order_events (order_id, status, note, created_by)
    values (p_order_id, p_status::text, p_note, p_created_by);
  end if;

  return coalesce(v_applied, false);
end;
$$;

revoke all on function public.mark_fulfilment_status(uuid, public.fulfilment_status, text, uuid) from public;
revoke execute on function public.mark_fulfilment_status(uuid, public.fulfilment_status, text, uuid) from anon;
revoke execute on function public.mark_fulfilment_status(uuid, public.fulfilment_status, text, uuid) from authenticated;
grant execute on function public.mark_fulfilment_status(uuid, public.fulfilment_status, text, uuid) to service_role;
