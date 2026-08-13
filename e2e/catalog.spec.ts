import { expect, test } from '@playwright/test';

/**
 * Covers the verification items left blocked in tasks 1.8-1.10 until the
 * database held real data. Fixture: "abib-hand-creme-type-g", basePriceMinor
 * 6400 (6.400 OMR), the only product carrying that handle in the seed.
 */

test.describe('product listing page', () => {
  test('renders cards with OMR prices on the Oman storefront', async ({ page }) => {
    await page.goto('/ar-om/products');
    await expect(page.getByRole('heading', { name: 'جميع المنتجات' })).toBeVisible();

    const cards = page.getByRole('link').filter({ has: page.getByRole('heading', { level: 3 }) });
    await expect(cards.first()).toBeVisible();
    // Prices are formatted "ر.ع." with three decimals — assert the pattern, not a
    // specific product, since listing order is not something this test should pin.
    // A card with a sale renders two prices, so take the first (current, not compare-at).
    await expect(cards.first().getByText(/\d\.\d{3}/).first()).toBeVisible();
  });

  test('renders cards with AED prices on the UAE storefront', async ({ page }) => {
    await page.goto('/en-ae/products');
    const cards = page.getByRole('link').filter({ has: page.getByRole('heading', { level: 3 }) });
    await expect(cards.first()).toBeVisible();
    // AED is 2-decimal, distinguishing it from the OMR/KWD/BHD 3-decimal cards.
    await expect(cards.first().getByText(/AED\s?\d/).first()).toBeVisible();
  });
});

test.describe('product detail page', () => {
  test('shows the Arabic name and price for a known product on /ar-om', async ({ page }) => {
    await page.goto('/ar-om/products/abib-hand-creme-type-g');
    await expect(
      page.getByRole('heading', { name: 'كريم يدين تايب جي من أبيب – 50مل' }),
    ).toBeVisible();
    // Rendered price carries an nbsp and bidi marks around the digits, so match
    // loosely rather than pin the exact invisible characters.
    await expect(page.getByText(/6\.400.*ر\.ع\./)).toBeVisible();
  });

  test('switching country changes the displayed currency', async ({ page }) => {
    await page.goto('/ar-om/products/abib-hand-creme-type-g');
    await expect(page.getByText(/6\.400.*ر\.ع\./)).toBeVisible();

    await page.getByRole('button', { name: 'الدولة' }).click();
    await page.getByRole('menuitem', { name: 'الإمارات' }).click();

    await expect(page).toHaveURL(/\/ar-ae\/products\/abib-hand-creme-type-g$/);
    // 6400 baisa x 9.55 AED/OMR, rounded up to the 25-fils step = 61.25 AED.
    await expect(page.getByText(/61\.25.*د\.إ\./)).toBeVisible();
  });
});

test.describe('filters and sorting', () => {
  test('filtering by brand narrows the grid and updates the shareable URL', async ({ page }) => {
    await page.goto('/en-ae/products');

    await page.getByRole('button', { name: 'Filters' }).click();
    // Fixture: brand "abib" carries 9 active products in the seed.
    await page.getByRole('button', { name: /^Abib/ }).click();
    // Close the drawer — while a Radix Dialog is open, everything behind it
    // is aria-hidden, so the grid below is invisible to role-based locators.
    await page.keyboard.press('Escape');

    await expect(page).toHaveURL(/[?&]brand=abib\b/);
    await expect(page.getByText('9 products')).toBeVisible();

    const cards = page.getByRole('link').filter({ has: page.getByRole('heading', { level: 3 }) });
    await expect(cards).toHaveCount(9);
  });

  test('sorting by price ascending on /en-ae orders cards low to high and updates the URL', async ({
    page,
  }) => {
    await page.goto('/en-ae/products');

    await page.getByRole('button', { name: 'Newest' }).click();
    await page.getByRole('menuitem', { name: 'Price: low to high' }).click();

    await expect(page).toHaveURL(/[?&]sort=price-asc\b/);
    await expect(page.getByRole('button', { name: 'Price: low to high' })).toBeVisible();

    const cards = page.getByRole('link').filter({ has: page.getByRole('heading', { level: 3 }) });
    const prices = await cards.evaluateAll((links) =>
      links.map((link) => {
        // The lead (current) price, not a struck-through compare-at price.
        const match = link.textContent?.match(/AED\s?([\d.]+)/);
        return match ? Number.parseFloat(match[1]) : NaN;
      }),
    );

    expect(prices.length).toBeGreaterThan(1);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });
});

test.describe('brand pages', () => {
  test('/ar-om/brands lists brands and links through to a brand page', async ({ page }) => {
    await page.goto('/ar-om/brands');
    await expect(page.getByRole('heading', { name: 'جميع العلامات التجارية' })).toBeVisible();

    const abib = page.getByRole('link', { name: 'منتجات أبيب (Abib) الكورية الأصلية' });
    await expect(abib).toBeVisible();
    await abib.click();

    await expect(page).toHaveURL(/\/ar-om\/brands\/abib$/);
    await expect(page.getByRole('link').filter({ has: page.getByRole('heading', { level: 3 }) }).first()).toBeVisible();
  });
});
