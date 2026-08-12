import { PagePlaceholder } from '@/components/layout/page-placeholder';

/** Content pages become DB-driven in Phase 3; the slug routing is settled now. */
export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PagePlaceholder title={slug.replace(/-/g, ' ')} />;
}
