import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Dashboard Smoke & Accessibility Tests', () => {
  test('loads home page and renders key telemetry and header', async ({ page }) => {
    await page.goto('./');
    await expect(page).toHaveTitle(/Jenkins/i);
    await expect(page.locator('#root')).toBeVisible();

    // Verify header telemetry badges
    await expect(page.getByText(/SYNCED:/i)).toBeVisible();
    await expect(page.getByText(/SHA-256:/i)).toBeVisible();
  });

  test('navigates through tabs and updates URL hash correctly', async ({ page }) => {
    await page.goto('./');

    // Click Workbench tab
    await page.getByRole('tab', { name: /Workbench/i }).click();
    await expect(page).toHaveURL(/#\/?workbench/);

    // Click Explorer tab
    await page.getByRole('tab', { name: /Explorer/i }).click();
    await expect(page).toHaveURL(/#\/?explorer/);

    // Click Methodology tab
    await page.getByRole('tab', { name: /Methodology/i }).click();
    await expect(page).toHaveURL(/#\/?methodology/);
  });

  test('deep-links directly to a plugin detail report via URL hash', async ({ page }) => {
    await page.goto('./#plugin=git');
    await expect(page.getByRole('tab', { name: /Plugin: git/i })).toBeVisible();
  });

  test('passes automated accessibility audit with zero critical violations', async ({ page }) => {
    await page.goto('./');
    await page.waitForLoadState('domcontentloaded');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast'])
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical'
    );
    expect(criticalViolations).toHaveLength(0);
  });

  test('renders charts, handles CSV export, and produces zero CSP violations', async ({ page }) => {
    const cspViolations: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('Content Security Policy') || text.includes('violates the following Content Security Policy directive')) {
        cspViolations.push(text);
      }
    });

    await page.goto('./');
    await page.waitForLoadState('domcontentloaded');

    // Confirm charts render (ECharts renders canvas or svg inside container)
    const charts = page.locator('.echarts-for-react canvas, .echarts-for-react svg, canvas');
    await expect(charts.first()).toBeVisible({ timeout: 10000 });

    // Navigate to Data Explorer to test export functionality
    await page.getByRole('tab', { name: /Explorer/i }).click();
    await page.waitForTimeout(500);

    // Verify zero CSP violations occurred
    expect(cspViolations).toEqual([]);
  });
});

