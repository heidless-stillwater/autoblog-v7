import { test, expect } from '@playwright/test';

test('image compression reduces file size and converts to jpeg', async ({ page }) => {
    // 1. Setup & Toggle Sidebar
    await page.goto('http://localhost:5173/signup');
    await page.fill('input[type="email"]', `test-comp-${Date.now()}@example.com`);
    await page.fill('input[id="password"]', 'password123');
    await page.fill('input[id="confirmPassword"]', 'password123');
    await page.click('button:has-text("Create Account")');

    // Wait for redirect to Dashboard
    await expect(page).toHaveURL('/');

    // 2. Inject Article and Prompt via Store (Before navigation!)
    // This ensures that when the component mounts, it sees our data immediately.
    // And we patch the service to prevent it from fetching empty data and overwriting ours.
    await page.evaluate(async () => {
        const store = (window as any).__STORE__.getState();

        // Mock loadUserData/loadImagePrompts/articlesService to prevent overwriting
        store.loadUserData = async () => console.log('Mock loadUserData');
        store.loadImagePrompts = async () => console.log('Mock loadImagePrompts');
        store.articlesService = { ...store.articlesService, getAll: async () => [] };

        const articleId = 'comp-test';
        const article = {
            id: articleId,
            topic: 'Compression Test',
            status: 'draft',
            currentVersionId: 'v1',
            versions: [{
                id: 'v1',
                content: '# Header\n\nContent.',
                title: 'Compression Test',
                createdAt: Date.now(),
                generatedBy: 'user'
            }],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        // Directly manipulate state
        (window as any).__STORE__.setState((state: any) => ({
            articles: [article],
            imagePrompts: [{
                id: 'p1',
                articleId,
                topic: 'Compression Test',
                sectionTitle: 'Header',
                prompt: 'Test Prompt',
                createdAt: Date.now(),
                updatedAt: Date.now()
            }]
        }));

        // Ensure dummy key
        if (!store.settings.geminiApiKey) {
            store.updateSettings({ geminiApiKey: 'dummy-key' });
        }
    });

    // 3. Navigate to AutoBlog via Sidebar (SPA Navigation)
    await page.click('a[href="/blog"]');
    await expect(page).toHaveURL('/blog');

    // 4. Mock Gemini API
    await page.route('**/models/*:generateContent*', async route => {
        const redDotPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
        const json = {
            candidates: [{
                content: {
                    parts: [{
                        inlineData: {
                            mimeType: 'image/png',
                            data: redDotPng
                        }
                    }]
                }
            }]
        };
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(json)
        });
    });

    // 5. Trigger Generation
    // Find the injected article card
    const articleCard = page.locator('div').filter({ hasText: 'Compression Test' }).last();
    await expect(articleCard).toBeVisible({ timeout: 10000 });

    // Allow any initial effects to settle
    await page.waitForTimeout(500);

    await articleCard.locator('button:has-text("Edit & Preview")').click();

    // Wait for prompt manager content
    const header = page.locator('h4:has-text("Header")');
    await expect(header).toBeVisible({ timeout: 10000 });

    // Hover and Generate
    const promptRow = page.locator('.group').filter({ hasText: 'Header' });
    await promptRow.hover();
    await promptRow.locator('button[title="Generate & Insert Image"]').click();

    // 6. Verify Result (JPEG)
    const img = page.locator('img[alt="Header"]');
    await expect(img).toBeVisible({ timeout: 10000 });

    const src = await img.getAttribute('src');
    expect(src).toContain('data:image/jpeg');

    await expect(page.locator('.text-red-400')).not.toBeVisible();
});
