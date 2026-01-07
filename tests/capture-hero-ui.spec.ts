import { test, expect } from '@playwright/test';

test('Capture Hero Image UI', async ({ page }) => {
    await page.goto('http://localhost:5175/blog');

    // Wait for articles and click first one
    await page.waitForSelector('h3');
    await page.locator('div.group.bg-slate-900').first().click();

    // Wait for editor and open Image Prompts
    await page.waitForSelector('button:has-text("Image Prompts")');
    await page.click('button:has-text("Image Prompts")');

    // Check if we have prompts, if not generate them
    const hasPrompts = await page.locator('h4:has-text("Hero Image")').count() > 0;
    if (!hasPrompts) {
        await page.click('button:has-text("Start AI Analysis")');
        // Wait for generation
        await page.waitForSelector('h4:has-text("Hero Image")', { timeout: 60000 });
    }

    // Take a screenshot of the manager
    await page.locator('div.bg-slate-900\\/50.border.border-slate-800.rounded-2xl').screenshot({ path: 'hero-image-ui.png' });
    console.log('Screenshot saved to hero-image-ui.png');
});
