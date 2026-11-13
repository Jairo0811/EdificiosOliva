import { expect, test } from '@playwright/test';
import { mockPublicApi } from './fixtures';

test('collects browser LCP and CLS laboratory evidence', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const w = window as typeof window & { __eoVitals?: { lcp: number | null; cls: number; shifts: unknown[] } };
    w.__eoVitals = { lcp: null, cls: 0, shifts: [] };
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        w.__eoVitals!.lcp = entry.startTime;
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as Array<PerformanceEntry & { value: number; hadRecentInput: boolean }>) {
        if (!entry.hadRecentInput) {
          w.__eoVitals!.cls += entry.value;
          const sources = (entry as typeof entry & { sources?: Array<{
            node?: Element; previousRect: DOMRectReadOnly; currentRect: DOMRectReadOnly;
          }> }).sources ?? [];
          w.__eoVitals!.shifts.push({
            value: entry.value,
            sources: sources.map((source) => ({
              element: source.node?.tagName,
              className: source.node?.getAttribute('class')?.slice(0, 100),
              before: source.previousRect?.toJSON(),
              after: source.currentRect?.toJSON(),
            })),
          });
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await mockPublicApi(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Tu estadía cómoda/ })).toBeVisible();
  await page.waitForTimeout(1500);
  const vitals = await page.evaluate(() =>
    (window as typeof window & { __eoVitals?: { lcp: number | null; cls: number } }).__eoVitals
  );
  await testInfo.attach('web-vitals-lab.json', {
    body: JSON.stringify({ page: '/', viewport: page.viewportSize(), ...vitals }, null, 2),
    contentType: 'application/json',
  });
  console.log('EO_WEB_VITALS', JSON.stringify(vitals));
  expect(vitals).toBeDefined();
  expect(vitals!.cls).toBeLessThan(0.25);
  // LCP is recorded for trend comparison, not asserted against a production SLO
  // because this CI uses mock data and no real network/CDN.
});
