import { expect, test } from '@playwright/test';
import { mockPublicApi } from './fixtures';

for (const width of [320, 390, 768, 1440]) {
  for (const path of ['/', '/reservar', '/contacto', '/galeria']) {
    test(`responsive: ${path} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 850 });
      await mockPublicApi(page);
      await page.goto(path);
      await expect(page.locator('body')).toBeVisible();
      // Check the main content, not horizontally scrollable tables or carousels.
      const overflow = await page.evaluate(() => {
        const targets = [...document.querySelectorAll('main, main > *, section, form')]
          .filter((node) => node.getBoundingClientRect().height > 0);
        return targets
          .map((node) => ({ name: node.tagName.toLowerCase(), rect: node.getBoundingClientRect() }))
          .filter(({ rect }) => rect.left < -2 || rect.right > innerWidth + 2)
          .map(({ name, rect }) => ({ name, left: Math.round(rect.left), right: Math.round(rect.right) }));
      });
      expect(overflow, `Content outside viewport at ${path} ${width}px`).toEqual([]);
    });
  }
}
