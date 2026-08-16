import { Button } from '@/components/ui/button';
import { listPendingReviews } from '@/lib/admin/reviews';
import { createClient } from '@/lib/supabase/server';
import { approveReviewAction, rejectReviewAction } from './actions';

export default async function AdminReviewsPage() {
  const client = await createClient();
  const reviews = await listPendingReviews(client);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Pending reviews ({reviews.length})</h1>

      <div className="flex flex-col gap-3">
        {reviews.map((r) => (
          <div key={r.id} className="flex flex-col gap-2 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">{r.productName}</span>
              <span className="text-muted-foreground text-sm">{r.rating} / 5</span>
            </div>
            <p className="text-sm">{r.body}</p>
            <div className="text-muted-foreground flex items-center justify-between text-xs">
              <span>Customer: {r.customerId}</span>
              <span>{new Date(r.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex gap-2">
              <form action={approveReviewAction.bind(null, r.id)}>
                <Button type="submit" size="sm">
                  Approve
                </Button>
              </form>
              <form action={rejectReviewAction.bind(null, r.id)}>
                <Button type="submit" variant="destructive" size="sm">
                  Reject
                </Button>
              </form>
            </div>
          </div>
        ))}
      </div>

      {reviews.length === 0 && <p className="text-muted-foreground text-sm">No pending reviews.</p>}
    </div>
  );
}
