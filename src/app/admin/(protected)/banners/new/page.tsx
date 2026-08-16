import { BannerForm } from '../banner-form';

export default function NewBannerPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">New banner</h1>
      <BannerForm initial={null} />
    </div>
  );
}
