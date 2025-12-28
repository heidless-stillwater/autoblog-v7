import { test, expect } from '@playwright/test';

test('Locate and inspect "Beyond Flying Cars" content', async ({ page }) => {
    await page.goto('http://localhost:5175/blog');

    // Wait for the article grid or a loader to disappear
    await page.waitForSelector('h3', { timeout: 10000 });

    const articleTitle = "Beyond Flying Cars: Unearthing the Unexpected Inventions of Retro Futuristic Visions";
    const card = page.locator('div.group.bg-slate-900', { hasText: articleTitle }).first();

    if (await card.count() > 0) {
        console.log('Article card found.');
        await card.click();

        // Wait for the editor to load
        await page.waitForURL(/\/blog\/.+/);
        await page.waitForSelector('textarea', { timeout: 10000 });

        const content = await page.locator('textarea').first().inputValue();
        console.log('--- CONTENT PREVIEW ---');
        console.log(content.substring(0, 1000));
        console.log('--- END PREVIEW ---');

        // Take a screenshot to see if it renders anything in preview
        await page.screenshot({ path: 'article-preview-debug.png' });
    } else {
        console.log('Article not found. Listing all titles to debug:');
        const titles = await page.locator('h3').allInnerTexts();
        titles.forEach(t => console.log(`- ${t}`));
    }
});
