-- Atomic, idempotent payment-status transition for webhook handlers
-- (`src/app/api/webhooks/{thawani,tap}/route.ts`). Same reasoning as
-- `create_order`: a plain JS read-then-write ("if current status isn't
-- already X, update to X and log an event") has a race — two concurrent
-- deliveries of the same webhook (both Thawani and Tap retry on anything but
-- a 2xx response) can both read the pre-update status and both insert an
-- `order_events` row, double-logging (and, for a future side effect like a
-- fulfilment email, double-sending) the same event.
--
-- The `where` clause below is both the idempotency guard (replaying an
-- already-applied transition matches no row) and the ordering guard (a
-- stray "failed" arriving after "paid" already landed is rejected, not
-- overwritten) in one atomic statement — Postgres locks the row for the
-- update's duration, so a concurrent second delivery necessarily
-- re-evaluates the `where` clause against the first delivery's committed
-- result, not a stale read. Mirrors `isAllowedPaymentTransition`
-- (`src/lib/payments/idempotency.ts`) exactly; keep both in sync.
create or replace function public.mark_payment_status(
  p_order_id uuid,
  p_status public.payment_status,
  p_note text
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
  set payment_status = p_status
  where id = p_order_id
    and (
      (payment_status = 'pending' and p_status in ('paid', 'failed'))
      or (payment_status = 'paid' and p_status = 'refunded')
    )
  returning true into v_applied;

  if v_applied then
    insert into public.order_events (order_id, status, note)
    values (p_order_id, p_status::text, p_note);
  end if;

  return coalesce(v_applied, false);
end;
$$;

revoke all on function public.mark_payment_status(uuid, public.payment_status, text) from public;
revoke execute on function public.mark_payment_status(uuid, public.payment_status, text) from anon;
revoke execute on function public.mark_payment_status(uuid, public.payment_status, text) from authenticated;
grant execute on function public.mark_payment_status(uuid, public.payment_status, text) to service_role;
