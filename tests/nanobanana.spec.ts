import { test, expect } from '@playwright/test';

test('nanobanana image generation shows descriptive errors', async ({ page }) => {
    // 1. Handle Signup
    await page.goto('http://localhost:5173/signup');
    const email = `test-img-${Date.now()}@example.com`;
    await page.fill('input[type="email"]', email);
    await page.fill('input[id="password"]', 'password123');
    await page.fill('input[id="confirmPassword"]', 'password123');
    await page.click('button:has-text("Create Account")');

    // 2. Inject Dummy Article and API Key
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

        // Ensure we have a dummy Gemini key if none exists
        if (!store.settings.geminiApiKey) {
            await store.updateSettings({ geminiApiKey: 'dummy-key-for-testing' });
        }

        const articleId = 'test-img-id-' + Date.now();
        const versionId = 'v1';
        const content = '# Main Title\n\n## Section One\n\nContent here.';

        await store.addArticle({
            id: articleId,
            topic: 'Image Test Topic',
            status: 'draft',
            currentVersionId: versionId,
            versions: [{
                id: versionId,
                content: content,
                title: 'Image Test Article',
                createdAt: Date.now(),
                generatedBy: 'ai'
            }],
            createdAt: Date.now(),
            updatedAt: Date.now()
        });

        await store.addImagePrompt({
            articleId,
            topic: 'Image Test Topic',
            sectionTitle: 'Section One',
            prompt: 'A beautiful sunrise',
            createdAt: Date.now(),
            updatedAt: Date.now()
        });
    });

    await page.goto('http://localhost:5173/blog');
    await page.click('button:has-text("Edit & Preview")');

    // 3. Expand Image Prompt Manager
    const manager = page.locator('h3:has-text("Image Generation Prompts")');
    await manager.click();

    // 4. Attempt to generate image
    await page.hover('h4:has-text("Section One")');
    const genButton = page.locator('button[title="Generate & Insert Image"]');
    await genButton.click();

    // 5. Look for error message
    // We expect it to fail if the key is dummy, but we want to see HOW it fails.
    // If it shows "Failed to generate image with NanoBanana." it means it hit the catch block.
    const errorText = page.locator('.text-red-400');
    await expect(errorText).toBeVisible({ timeout: 10000 });
    const message = await errorText.textContent();
    console.log('Caught Error UI Message:', message);
});
