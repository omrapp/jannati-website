import { ContentPageForm } from '../content-page-form';

export default function NewContentPagePage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">New page</h1>
      <ContentPageForm initial={null} />
    </div>
  );
}
