import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { mockPublicApi } from './fixtures';

for (const path of ['/', '/reservar', '/contacto', '/galeria']) {
  test(`WCAG axe-core audit: ${path}`, async ({ page }, testInfo) => {
    await mockPublicApi(page);
    await page.goto(path);
    await expect(page.locator('#contenido-principal')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    const violations = results.violations.map((item) => ({
      id: item.id,
      impact: item.impact,
      description: item.description,
      nodes: item.nodes.map((node) => ({
        target: node.target,
        summary: node.failureSummary,
      })),
    }));
    await testInfo.attach('axe-wcag.json', {
      body: JSON.stringify({ path, violations }, null, 2),
      contentType: 'application/json',
    });

    console.log('EO_AXE_AUDIT', JSON.stringify({
      path,
      violations: violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.slice(0, 6) })),
    }));
    const blocking = violations.filter((item) => item.impact === 'serious' || item.impact === 'critical');
    expect(blocking, `Serious/critical accessibility violations at ${path}`).toEqual([]);
  });
}
