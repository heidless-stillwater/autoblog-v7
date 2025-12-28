import { test, expect } from '@playwright/test';

test('autoblog edit functionality works', async ({ page }) => {
    // 1. Handle Signup
    await page.goto('http://localhost:5173/signup');
    const email = `test-${Date.now()}@example.com`;
    await page.fill('input[type="email"]', email);
    await page.fill('input[id="password"]', 'password123');
    await page.fill('input[id="confirmPassword"]', 'password123');
    await page.click('button:has-text("Create Account")');

    // 2. Inject Dummy Article and Settings
    await page.evaluate(async () => {
        // Wait for auth to sync to store
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

        // Update settings
        await store.updateSettings({
            perplexityApiKey: 'test-key',
            geminiApiKey: 'test-key'
        });

        // Add dummy article
        const articleId = 'test-id-' + Date.now();
        const versionId = 'v1';
        await store.addArticle({
            id: articleId,
            topic: 'Playwright Test Topic',
            status: 'draft',
            currentVersionId: versionId,
            versions: [{
                id: versionId,
                content: '# Initial Content\n\nThis is a test article.',
                title: 'Playwright Test Article',
                createdAt: Date.now(),
                generatedBy: 'ai'
            }],
            createdAt: Date.now(),
            updatedAt: Date.now()
        });
    });

    await page.goto('http://localhost:5173/blog');

    // 3. Click Edit & Preview
    await page.click('button:has-text("Edit & Preview")');

    // 3. Verify Editor & Edit Functionality
    await expect(page).toHaveURL(/\/blog\/.+/);

    // Find the textarea
    const textarea = page.locator('textarea[placeholder="Write your story..."]');
    await expect(textarea).toBeVisible();

    // Type new content
    const baseContent = '# Initial Content\n\nThis is a test article.';
    const testContent = 'VERIFIED_EDIT_CONTENT';
    const fullContent = `${baseContent}\n\n${testContent}`;
    await textarea.fill(fullContent);

    // Verify textarea has new value
    const updatedValue = await textarea.inputValue();
    expect(updatedValue).toContain(testContent);

    // 4. Verify Preview
    await page.click('button:has-text("Preview")');
    const preview = page.locator('.prose');
    await expect(preview).toBeVisible();
    await expect(preview).toContainText('VERIFIED_EDIT_CONTENT');

    // 5. Verify Unresponsiveness is gone (by typing more rapidly)
    await page.click('button:has-text("Edit")');
    await textarea.type(' - Fast Typing Check');
    const finalValue = await textarea.inputValue();
    expect(finalValue).toContain('Fast Typing Check');
});
