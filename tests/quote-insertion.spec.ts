import { test, expect } from '@playwright/test';

test('quote insertion works correctly with special characters and different header levels', async ({ page }) => {
    // 1. Handle Signup
    await page.goto('http://localhost:5173/signup');
    const email = `test-quote-${Date.now()}@example.com`;
    await page.fill('input[type="email"]', email);
    await page.fill('input[id="password"]', 'password123');
    await page.fill('input[id="confirmPassword"]', 'password123');
    await page.click('button:has-text("Create Account")');

    // 2. Inject Dummy Article with varied headers
    await page.evaluate(async () => {
        const waitForUser = () => new Promise<void>((resolve) => {
            const check = () => {
                const state = (window as any).__STORE__.getState();
                if (state.user) resolve();
                else setTimeout(check, 100);
            };
            check();
        });

        await waitForUser();
        const store = (window as any).__STORE__.getState();

        const articleId = 'test-quote-id-' + Date.now();
        const versionId = 'v1';
        const content = '# Main Title\n\n## Section One: The Beginning?\n\nContent here.\n\n### Section Two (Advanced)!\n\nMore content.';

        await store.addArticle({
            id: articleId,
            topic: 'Quote Test Topic',
            status: 'draft',
            currentVersionId: versionId,
            versions: [{
                id: versionId,
                content: content,
                title: 'Quote Test Article',
                createdAt: Date.now(),
                generatedBy: 'ai'
            }],
            createdAt: Date.now(),
            updatedAt: Date.now()
        });

        // Add dummy image prompts
        await store.addImagePrompt({
            articleId,
            topic: 'Quote Test Topic',
            sectionTitle: 'Section One: The Beginning?',
            prompt: 'A beautiful sunrise',
            createdAt: Date.now(),
            updatedAt: Date.now()
        });

        await store.addImagePrompt({
            articleId,
            topic: 'Quote Test Topic',
            sectionTitle: 'Section Two (Advanced)!',
            prompt: 'A futuristic city',
            createdAt: Date.now(),
            updatedAt: Date.now()
        });
    });

    await page.goto('http://localhost:5173/blog');
    await page.click('button:has-text("Edit & Preview")');

    // 3. Expand Image Prompt Manager
    const manager = page.locator('h3:has-text("Image Generation Prompts")');
    await manager.click();

    // 4. Insert Quote for Section One (has ?)
    await page.hover('h4:has-text("Section One: The Beginning?")');
    await page.click('button[title="Insert as Quote"] >> nth=0');

    // 5. Verify insertion position for Section One
    const textarea = page.locator('textarea[placeholder="Write your story..."]');
    let value = await textarea.inputValue();
    expect(value).toContain('> **AI Image Prompt:** A beautiful sunrise\n\n## Section One: The Beginning?');

    // 6. Insert Quote for Section Two (has () and !)
    await page.hover('h4:has-text("Section Two (Advanced)!")');
    await page.click('button[title="Insert as Quote"] >> nth=1');

    // 7. Verify insertion position for Section Two
    value = await textarea.inputValue();
    expect(value).toContain('> **AI Image Prompt:** A futuristic city\n\n### Section Two (Advanced)!');
});
