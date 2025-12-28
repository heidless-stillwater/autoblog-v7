import { test, expect } from '@playwright/test';

test('List all articles', async ({ page }) => {
    await page.goto('http://localhost:5175/blog');

    // Wait for articles to load
    await page.waitForTimeout(2000);

    // Get all article titles from the cards
    const titles = await page.locator('h3').allInnerTexts();
    console.log('--- ALL ARTICLES ---');
    titles.forEach((title, i) => console.log(`${i + 1}: ${title}`));
    console.log('--------------------');
});
