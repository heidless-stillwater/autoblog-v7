import { test, expect } from '@playwright/test';

test('Diagnostic: Jump to Section', async ({ page }) => {
    // Navigate to blog and select first article
    await page.goto('http://localhost:5175/blog');
    await page.waitForSelector('h3');
    await page.locator('div.group.bg-slate-900').first().click();

    // Open Image Prompts
    await page.waitForSelector('button:has-text("Image Prompts")');
    await page.click('button:has-text("Image Prompts")');

    // Wait for prompts (or generate if missing)
    const promptsCount = await page.locator('button[title="Jump to Section"]').count();
    if (promptsCount === 0) {
        await page.click('button:has-text("Start AI Analysis")');
        await page.waitForSelector('button[title="Jump to Section"]', { timeout: 60000 });
    }

    // Get the title of the first non-hero prompt to jump to
    // Hero always jumps to top, let's try a specific section
    const jumpButtons = page.locator('button[title="Jump to Section"]');
    const firstNonHero = jumpButtons.nth(1); // Usually index 1 is first section after hero

    // Click jump
    await firstNonHero.click();

    // Check for highlight effect in logs or DOM
    // We can check if any block has the highlight style applied temporarily
    // The highlight lasts 2 seconds
    const highlighted = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('[data-block-id]'));
        return elements.some(el => (el as HTMLElement).style.backgroundColor.includes('rgba(79, 70, 229'));
    });

    console.log('Jump button clicked. Highlight detected:', highlighted);

    // Take a screenshot to see where it landed
    await page.screenshot({ path: 'jump-diagnostic.png' });

    // Fail if no highlight was found (meaning target block was not identified/highlighted)
    expect(highlighted).toBeTruthy();
});
