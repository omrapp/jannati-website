import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage serves all product imagery.
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
      // Content-page hero images: admin-editable URLs (see `content_pages.hero_image_url`),
      // seeded from Pexels for about-us/faqs/shipping-policy/returns. Pixabay
      // allowlisted too since admins are free to swap in either source.
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'https', hostname: 'cdn.pixabay.com' },
    ],
  },
};

export default withNextIntl(nextConfig);
