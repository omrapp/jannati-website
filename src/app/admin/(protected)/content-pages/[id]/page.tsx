import { notFound } from 'next/navigation';

import { getContentPage } from '@/lib/admin/content-pages';
import { createClient } from '@/lib/supabase/server';
import { ContentPageForm } from '../content-page-form';

export default async function EditContentPagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await createClient();
  const page = await getContentPage(client, id);
  if (!page) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Edit page</h1>
      <ContentPageForm
        initial={{
          id: page.id,
          slug: page.slug,
          titleAr: page.title_ar,
          titleEn: page.title_en ?? '',
          bodyAr: page.body_ar,
          bodyEn: page.body_en ?? '',
          heroImageUrl: page.hero_image_url ?? '',
          published: page.published,
        }}
      />
    </div>
  );
}
