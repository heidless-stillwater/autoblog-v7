import { test, expect } from '@playwright/test';

test('visual editor preserves whitespace and complex content', async ({ page }) => {
    // 1. Setup
    await page.goto('http://localhost:5173/signup');
    await page.fill('input[type="email"]', `test-fid-${Date.now()}@example.com`);
    await page.fill('input[id="password"]', 'password123');
    await page.fill('input[id="confirmPassword"]', 'password123');
    await page.click('button:has-text("Create Account")');

    // 2. Inject Article with complex structure
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

        const content = `Paragraph 1.

![Image A](urlA)

![Image B](urlB)

Paragraph 2.`;

        await store.addArticle({
            id: 'fid-test',
            topic: 'Fidelity Test',
            status: 'draft',
            currentVersionId: 'v1',
            versions: [{
                id: 'v1',
                content: content,
                title: 'Fidelity Test',
                createdAt: Date.now(),
                generatedBy: 'user'
            }],
            createdAt: Date.now(),
            updatedAt: Date.now()
        });
    });

    await page.goto('http://localhost:5173/blog');
    await page.click('button:has-text("Edit & Preview")');

    // 3. Verify Blocks
    // We expect: Text(Para 1), Image A, Text(whitespace), Image B, Text(Para 2)
    // If whitespace is eaten, we might miss the middle text block.

    // Check for Image A
    await expect(page.locator('img[alt="Image A"]')).toBeVisible();

    // Check for Image B
    await expect(page.locator('img[alt="Image B"]')).toBeVisible();

    // Check separation
    // There should be a textarea between them?
    // The previous implementation ate trimmed text.
    // If trimmed text is eaten, we expect 3 textareas total (Top, Bottom, but middle is lost? or Merged?)
    // Actually, parse logic:
    // 1. "Paragraph 1.\n\n" -> Text Block
    // 2. Image A
    // 3. "\n\n" -> Trim is empty -> SKIPPED
    // 4. Image B
    // 5. "\n\nParagraph 2." -> Text Block

    // So we expect 2 textareas initially if bug exists.
    // Ideally we want 3 (or the spaces preserved).

    const textareas = page.locator('textarea[placeholder="Continue writing..."]');
    // We can count them.
    const count = await textareas.count();
    console.log('Textarea count:', count);

    // If whitespace was eaten, clicking 'Preview' should show images stuck together?
    await page.click('button:has-text("Preview")');
    const previewContent = page.locator('.prose');
    const html = await previewContent.innerHTML();

    // In markdown, if they are stuck together `![A](u)![B](u)`, they render inline.
    // If separated by newlines, they usually block.
    // We want to verify if the original spacing key was preserved.

    const editorContent = await page.evaluate(() => {
        const state = (window as any).__STORE__.getState();
        const article = state.articles.find((a: any) => a.id === 'fid-test');
        return article.versions[0].content;
    });

    console.log('Editor Content:', JSON.stringify(editorContent));

    expect(editorContent).toContain('![Image A](urlA)\n\n![Image B](urlB)');
});
