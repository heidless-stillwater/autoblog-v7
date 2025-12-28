import { test, expect } from '@playwright/test';

test('preview renders markdown headers', async ({ page }) => {
    // We'll need to bypass auth or login
    await page.goto('http://localhost:5173/login');
    // ... login logic if needed ...

    // For now, let's try to go directly if auth is not strictly enforced on dev
    await page.goto('http://localhost:5173/posts/new');

    // Set content with a header
    const headerText = 'The Allure of Order: Why Dystopian Societies Are So Appealing in Fiction';
    const markdown = '# ' + headerText;

    // Since we can't easily interact with the react state from outside,
    // we'll try to type it in the textarea if we can find it.
    await page.fill('textarea[placeholder="Post Title"]', 'Test Title');
    await page.fill('textarea[placeholder="Write your story..."]', markdown);

    // Click Preview
    await page.click('button:has-text("Preview")');

    // Wait for modal
    await page.waitForSelector('.prose');

    // Check if there is an h1 inside .prose
    const h1 = page.locator('.prose h1');
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText(headerText);

    // Check computed style of h1
    const fontSize = await h1.evaluate((el) => window.getComputedStyle(el).fontSize);
    console.log('H1 Font Size:', fontSize);

    // If h1 is not there, check what IS there
    const content = await page.locator('.prose').innerHTML();
    console.log('Prose HTML:', content);
});
