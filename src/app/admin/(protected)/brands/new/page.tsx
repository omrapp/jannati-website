import { BrandForm } from '../brand-form';

export default function NewBrandPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">New brand</h1>
      <BrandForm initial={null} />
    </div>
  );
}
