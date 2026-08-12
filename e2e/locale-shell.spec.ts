import { expect, test } from '@playwright/test';

test.describe('locale shell', () => {
  test('root redirects to the Arabic Oman storefront', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/ar-om$/);
  });

  test('Arabic storefront renders right-to-left', async ({ page }) => {
    await page.goto('/ar-om');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('dir', 'rtl');
    await expect(html).toHaveAttribute('lang', 'ar-OM');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('جمالك يبدأ من هنا');
  });

  test('English storefront renders left-to-right', async ({ page }) => {
    await page.goto('/en-ae');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('dir', 'ltr');
    await expect(html).toHaveAttribute('lang', 'en-AE');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your beauty starts here');
  });

  test('language switch keeps the shopper in the same country and page', async ({ page }) => {
    await page.goto('/ar-om/products');
    await page.getByRole('button', { name: 'English' }).click();
    await expect(page).toHaveURL(/\/en-om\/products$/);
  });

  test('country switch keeps the shopper in the same language', async ({ page }) => {
    await page.goto('/ar-om');
    await page.getByRole('button', { name: 'الدولة' }).click();
    await page.getByRole('menuitem', { name: 'الإمارات' }).click();
    await expect(page).toHaveURL(/\/ar-ae$/);
  });

  test('dark theme applies and survives a reload', async ({ page }) => {
    await page.goto('/en-ae');
    await page.getByRole('button', { name: 'Theme' }).click();
    await page.getByRole('menuitem', { name: 'Dark' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
  });
});
