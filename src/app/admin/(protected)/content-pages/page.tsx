import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { listContentPages } from '@/lib/admin/content-pages';
import { createClient } from '@/lib/supabase/server';

export default async function AdminContentPagesPage() {
  const client = await createClient();
  const pages = await listContentPages(client);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Pages ({pages.length})</h1>
        <Button asChild>
          <Link href="/admin/content-pages/new">New page</Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {pages.map((p) => (
          <Link
            key={p.id}
            href={`/admin/content-pages/${p.id}`}
            className="grid grid-cols-[1fr_1fr_auto] items-center gap-3 rounded-md border p-3 hover:bg-muted/50"
          >
            <span className="font-mono text-sm">{p.slug}</span>
            <span>{p.title_en || p.title_ar}</span>
            <Badge variant={p.published ? 'default' : 'secondary'}>{p.published ? 'Published' : 'Draft'}</Badge>
          </Link>
        ))}
      </div>

      {pages.length === 0 && <p className="text-muted-foreground text-sm">No pages yet.</p>}
    </div>
  );
}
