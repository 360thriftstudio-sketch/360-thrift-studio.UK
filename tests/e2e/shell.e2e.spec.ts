import { expect, test } from '@playwright/test'

test.describe('site shell', () => {
  test('home renders CMS sections, header and footer disclaimer', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.getByRole('link', { name: /T-Shirts/ }).first()).toBeAttached()
    await expect(page.getByRole('img', { name: '360° Thrift Studio' }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /Bags \(Women\)/ }).first()).toBeAttached()
    await expect(page.getByText('Not affiliated with or endorsed by any brand shown')).toBeVisible()
  })

  test('skip link moves focus to main content', async ({ page, isMobile }) => {
    test.skip(isMobile, 'keyboard test')
    await page.goto('/')
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Skip to content' })
    await expect(skip).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#main$/)
  })

  test('mega menu opens with keyboard and closes with Escape', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop menu')
    await page.goto('/')
    const shop = page.getByRole('button', { name: 'Shop' })
    await shop.focus()
    await page.keyboard.press('Enter')
    await expect(shop).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('link', { name: 'Jackets', exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(shop).toHaveAttribute('aria-expanded', 'false')
    await expect(shop).toBeFocused()
  })

  test('brand menu shows text wordmarks while SHOW_BRAND_LOGOS is off', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop menu')
    await page.goto('/')
    await page.getByRole('button', { name: 'Brands' }).click()
    await expect(page.locator('[data-mode="wordmark"]').first()).toBeVisible()
    await expect(page.locator('header img[alt$="— view lots"]')).toHaveCount(0)
  })

  test('mobile menu drawer opens and traps focus', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile menu')
    await page.goto('/')
    await page.getByRole('button', { name: 'Open menu' }).click()
    const dialog = page.getByRole('dialog', { name: 'Menu' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('searchbox')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })

  test('brand marquee has a working pause button', async ({ page }) => {
    await page.goto('/')
    const pause = page.getByRole('button', { name: /Pause brand scroll/ })
    await pause.click()
    await expect(page.getByRole('button', { name: /Play brand scroll/ })).toHaveAttribute('aria-pressed', 'true')
  })
})
