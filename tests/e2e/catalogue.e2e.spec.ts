import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

/** Requires `pnpm seed --demo` data. */

const PAGES = ['/', '/shop', '/shop/puffer-jackets', '/brands', '/brands/the-north-face', '/lot/50x-the-north-face-puffer-jackets-core-550-650-fill', '/quote', '/account', '/trade-account', '/about']

for (const path of PAGES) {
  test(`no serious or critical axe violations on ${path}`, async ({ page }) => {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
    const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    expect(blocking, JSON.stringify(blocking.map((b) => ({ id: b.id, nodes: b.nodes.slice(0, 3).map((n) => n.target) })), null, 2)).toEqual([])
  })
}

test('facets filter, sync to the URL and can be cleared', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop sidebar')
  await page.goto('/shop/puffer-jackets')
  await expect(page.getByText(/\d+ lots found/)).toBeVisible()
  await page.getByRole('checkbox', { name: /The North Face/ }).check()
  await expect(page).toHaveURL(/brand=the-north-face/)
  await expect(page.getByRole('button', { name: /Brand: The North Face/ })).toBeVisible()
  await expect(page.getByText('4 lots found')).toBeVisible()
  await page.getByRole('button', { name: 'Clear all' }).click()
  await expect(page).not.toHaveURL(/brand=/)
})

test('filtered URLs are noindex with a clean canonical', async ({ page }) => {
  await page.goto('/shop/puffer-jackets?grade=a')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/shop\/puffer-jackets$/)
})

test('tier price updates live with quantity', async ({ page }) => {
  await page.goto('/lot/50x-the-north-face-puffer-jackets-core-550-650-fill')
  const box = page.locator('main')
  await expect(box.getByText('£1,650.00').last()).toBeVisible()
  await box.getByRole('button', { name: 'Increase' }).first().click()
  await expect(box.getByText('£3,135.00')).toBeVisible() // 2 × £1,567.50
})

test('trade-only lots hide prices from guests', async ({ page }) => {
  await page.goto('/lot/25x-the-north-face-puffer-jackets-premium-nuptse-baltoro')
  await expect(page.getByText('Trade prices are visible after a quick account check.')).toBeVisible()
  await expect(page.getByText('£1,450')).toHaveCount(0)
})

test('brand pages carry the independent-reseller disclaimer and no third-party logos', async ({ page }) => {
  await page.goto('/brands/carhartt')
  await expect(page.getByText('Independent reseller — not affiliated with Carhartt.')).toBeVisible()
  await expect(page.locator('img[alt$="— view lots"]')).toHaveCount(0)
})

test('full RFQ: add to quote → create account → details → send → see it in the account', async ({ page }) => {
  const email = `buyer-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`
  await page.goto('/lot/40x-adidas-firebird-sst-track-jackets')
  await page.locator('main').getByRole('button', { name: 'Add to quote' }).first().click()
  const drawer = page.getByRole('dialog', { name: /Your quote basket \(1 lot\)/ })
  await expect(drawer).toBeVisible()
  await drawer.getByRole('link', { name: 'Request my quote' }).click()

  await expect(page).toHaveURL(/\/quote$/)
  await page.getByRole('button', { name: 'Continue to details' }).click()
  await page.getByRole('tab', { name: 'Create account' }).click()
  await page.getByLabel('Company', { exact: true }).fill('E2E Resell Ltd')
  await page.getByLabel('Your name', { exact: true }).fill('Alex Buyer')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel(/^Password/).fill('correct-horse-battery')
  await page.getByLabel('Country', { exact: true }).fill('United Kingdom')
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page.getByLabel('Contact name')).toHaveValue('Alex Buyer', { timeout: 15_000 })
  await page.getByRole('button', { name: 'Review request' }).click()
  await expect(page.getByText('Choose a shipping method').first()).toBeVisible() // error summary + inline
  await page.getByLabel('Shipping method').selectOption('uk-courier')
  await page.getByRole('button', { name: 'Review request' }).click()

  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Send quote request' }).click()
  const status = page.getByRole('status').filter({ hasText: /Quote request QR-\d{4}-\d{4} sent/ })
  await expect(status).toBeVisible({ timeout: 15_000 })
  const ref = (await status.textContent())!.match(/QR-\d{4}-\d{4,}/)![0]

  await page.goto('/account')
  await expect(page.getByRole('link', { name: ref })).toBeVisible()
  await expect(page.getByText('Submitted').first()).toBeVisible()
})
