import { test, expect } from '@playwright/test';

test('Inspect article headers for Beyond Flying Cars', async ({ page }) => {
    // 1. Login/Signup if needed, or just go to blog
    await page.goto('http://localhost:5175/blog');

    // 2. Find the article card with the title
    const articleCard = page.locator('div', { hasText: 'Beyond Flying Cars: Unearthing the Unexpected Inventions of Retro Futuristic Visions' });
    if (await articleCard.count() === 0) {
        console.log('Article not found by full title, trying partial');
        const partialCard = page.locator('div', { hasText: 'Beyond Flying Cars' }).first();
        if (await partialCard.count() > 0) {
            await partialCard.click();
        } else {
            console.log('Article NOT found at all.');
            return;
        }
    } else {
        await articleCard.click();
    }

    // 3. Click Edit & Preview
    await page.click('button:has-text("Edit & Preview")');
    await page.waitForURL(/\/blog\/.+/);

    // 4. Capture the content of the textarea
    const textarea = page.locator('textarea').first();
    const content = await textarea.inputValue();
    console.log('--- ARTICLE CONTENT START ---');
    console.log(content);
    console.log('--- ARTICLE CONTENT END ---');

    // 5. Check if ImagePromptManager has prompts and what their titles are
    const prompts = page.locator('.group.relative.p-4.rounded-xl.border h4');
    const promptCount = await prompts.count();
    console.log(`Found ${promptCount} prompts`);
    for (let i = 0; i < promptCount; i++) {
        const title = await prompts.nth(i).innerText();
        console.log(`Prompt ${i + 1} Title: [${title}]`);
    }
});
