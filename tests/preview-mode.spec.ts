import { test, expect } from '@playwright/test';

test('preview mode shows latest changes including images', async ({ page }) => {
    // 1. Setup & Toggle Sidebar
    await page.goto('http://localhost:5173/signup');
    await page.fill('input[type="email"]', `test-preview-${Date.now()}@example.com`);
    await page.fill('input[id="password"]', 'password123');
    await page.fill('input[id="confirmPassword"]', 'password123');
    await page.click('button:has-text("Create Account")');

    await expect(page).toHaveURL('/');

    // 2. Inject Article via Store
    await page.evaluate(async () => {
        const store = (window as any).__STORE__.getState();
        // Prevent clearing if already logged in (store prevails) - wait, this is a clean run usually.

        const articleId = 'preview-test';
        const article = {
            id: articleId,
            topic: 'Preview Test',
            status: 'draft',
            currentVersionId: 'v1',
            versions: [{
                id: 'v1',
                content: '# Original Content',
                title: 'Preview Test',
                createdAt: Date.now(),
                generatedBy: 'user'
            }],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        // Directly manipulate state to inject article
        (window as any).__STORE__.setState((state: any) => ({
            articles: [article],
            isLoading: false
        }));
    });

    // 3. Navigate to AutoBlog
    await page.click('a[href="/blog"]');
    await expect(page).toHaveURL('/blog');

    // 4. Open Editor
    const articleCard = page.locator('div').filter({ hasText: 'Preview Test' }).last();
    await expect(articleCard).toBeVisible({ timeout: 10000 });
    await articleCard.locator('button:has-text("Edit & Preview")').click();

    // 5. Modify Content (Add Text Block)
    // Find the textarea (first block)
    const textarea = page.locator('textarea').first();
    await textarea.fill('# Original Content\n\nNew Block Added');

    // 6. Switch to Preview
    await page.click('button:has-text("Preview")');

    // 7. Verify Preview Content
    // MarkdownRenderer renders h1 for # and p for text
    const previewArea = page.locator('.prose'); // Markdown renderer wrapper
    await expect(previewArea).toBeVisible();
    await expect(previewArea).toContainText('New Block Added');

    // 8. Go back to Edit and Add Image (Simulate)
    await page.click('button:has-text("Edit")');

    // We can simulate an image block addition by modifying the textarea again with markdown image syntax
    // The parser will convert it to an image block, but for localContent sync check, basic text update is enough proof.
    // However, user specifically mentioned "image displays in edit page... does not appear in preview".
    // So let's test specific image syntax.
    await textarea.fill('# Original Content\n\n![Test Image](https://via.placeholder.com/150)');

    // Switch to Preview
    await page.click('button:has-text("Preview")');

    // Verify Image in Preview
    const img = previewArea.locator('img[alt="Test Image"]');
    await expect(img).toBeVisible();
    await expect(img).toHaveAttribute('src', 'https://via.placeholder.com/150');
});
