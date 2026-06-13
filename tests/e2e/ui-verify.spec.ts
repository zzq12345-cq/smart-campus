import { expect, test } from '@playwright/test'

function compact(text: string, length = 240) {
  return text.replace(/\s+/g, ' ').trim().slice(0, length)
}

test('verify study/life pages text and icon rendering', async ({ page }) => {
  page.on('pageerror', (error) => {
    console.log(`PAGE_ERROR=${error.message}`)
  })
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log(`CONSOLE_ERROR=${msg.text()}`)
    }
  })

  await page.goto('http://localhost:5173/#/pages/study/index', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)

  const studyText = await page.locator('body').innerText()
  const studyIcons = await page.locator('.iconfont').allTextContents()
  await page.screenshot({ path: 'playwright-study.png', fullPage: true })

  console.log(`STUDY_TEXT_LEN=${studyText.length}`)
  console.log(`STUDY_TEXT_SAMPLE=${compact(studyText)}`)
  console.log(`STUDY_ICON_COUNT=${studyIcons.length}`)
  console.log(`STUDY_ICON_SAMPLE=${studyIcons.slice(0, 16).join('|')}`)

  await expect(page.getByText(/学习|Study/i).first()).toBeVisible()

  await page.goto('http://localhost:5173/#/pages/life/index', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  const lifeText = await page.locator('body').innerText()
  await page.screenshot({ path: 'playwright-life.png', fullPage: true })
  console.log(`LIFE_TEXT_LEN=${lifeText.length}`)
  console.log(`LIFE_TEXT_SAMPLE=${compact(lifeText)}`)
  await expect(page.getByText(/生活|Life/i).first()).toBeVisible()
})
