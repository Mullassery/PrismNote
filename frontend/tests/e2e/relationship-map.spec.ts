import { test, expect } from '@playwright/test'
import { KeyboardStressTester } from '../helpers/keyboard-stress'

/**
 * Relationship Map E2E smoke tests.
 *
 * The map itself only mounts after a real database connection has populated
 * the schema cache (`App.tsx` gates it on `selectedTableMeta`). The frontend
 * E2E harness runs without the Rust backend, so these tests cover the part
 * that is reachable end-to-end: the activity-rail entry point, its pressed
 * state, and the fact that toggling it never traps the UI or breaks global
 * shortcuts. Pure graph construction is covered by
 * `src/__tests__/graphBuilder.test.ts`.
 */

test.describe('Relationship Map - activity rail entry point', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByText('PrismNote').first()).toBeVisible()
  })

  test('exposes a Relationship Map control in the activity rail', async ({ page }) => {
    const button = page.getByTitle('Relationship Map').first()
    await expect(button).toBeVisible()
    await expect(button).not.toHaveAttribute('aria-pressed', 'true')
  })

  test('toggles pressed state without crashing or opening an empty panel', async ({ page }) => {
    const button = page.getByTitle('Relationship Map').first()

    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('PrismNote').first()).toBeVisible()

    await button.click()
    await expect(button).not.toHaveAttribute('aria-pressed', 'true')
  })

  test('global shortcuts still work after toggling the map', async ({ page }) => {
    const button = page.getByTitle('Relationship Map').first()
    await button.click()

    const stress = new KeyboardStressTester(page)
    await stress.openSearch()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Search' })).toHaveCount(0)
  })
})
