import { test, expect } from '@playwright/test';

test('visual block editor renders images and allows editing', async ({ page }) => {
    // 1. Setup
    await page.goto('http://localhost:5173/signup');
    const email = `test-visual-${Date.now()}@example.com`;
    await page.fill('input[type="email"]', email);
    await page.fill('input[id="password"]', 'password123');
    await page.fill('input[id="confirmPassword"]', 'password123');
    await page.click('button:has-text("Create Account")');

    // 2. Inject Article with Image
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

        const articleId = 'test-visual-id-' + Date.now();
        const content = 'Before image\n\n![Test Image](https://via.placeholder.com/150)\n\nAfter image';

        await store.addArticle({
            id: articleId,
            topic: 'Visual Editor Test',
            status: 'draft',
            currentVersionId: 'v1',
            versions: [{
                id: 'v1',
                content: content,
                title: 'Visual Editor Test Article',
                createdAt: Date.now(),
                generatedBy: 'user'
            }],
            createdAt: Date.now(),
            updatedAt: Date.now()
        });
    });

    await page.goto('http://localhost:5173/blog');
    await page.click('button:has-text("Edit & Preview")');

    // 3. Verify Edit Mode shows Image
    const img = page.locator('img[alt="Test Image"]');
    await expect(img).toBeVisible();

    // 4. Verify Textareas exist
    const textareas = page.locator('textarea[placeholder="Continue writing..."]');
    await expect(textareas).toHaveCount(2);

    // 5. Edit Text and Verify Preview
    await textareas.nth(0).fill('Updated Before');
    await page.click('button:has-text("Preview")');

    const previewContent = page.locator('.prose');
    await expect(previewContent).toContainText('Updated Before');
    await expect(previewContent.locator('img')).toHaveAttribute('src', 'https://via.placeholder.com/150');

    // 6. Delete Image Block
    await page.click('button:has-text("Edit")');
    await page.hover('img[alt="Test Image"]');
    await page.click('button[title="Delete block"]');

    await expect(img).not.toBeVisible();

    // 7. Verify Markdown joined correctly
    await page.click('button:has-text("Preview")');
    await expect(previewContent.locator('img')).not.toBeVisible();
});
