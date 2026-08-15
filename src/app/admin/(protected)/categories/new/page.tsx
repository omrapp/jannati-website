import { listCategories } from '@/lib/admin/taxonomy';
import { createClient } from '@/lib/supabase/server';
import { CategoryForm } from '../category-form';

export default async function NewCategoryPage() {
  const client = await createClient();
  const categories = await listCategories(client);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">New category</h1>
      <CategoryForm
        initial={null}
        categories={categories.map((c) => ({ id: c.id, label: c.name_en ?? c.name_ar }))}
      />
    </div>
  );
}
