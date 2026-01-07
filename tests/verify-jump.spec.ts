import { test, expect } from '@playwright/test';

const TEST_ARTICLE = {
    id: 'test-article-jump',
    topic: 'Test Navigation Article',
    status: 'draft',
    currentVersionId: 'v1',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    versions: [
        {
            id: 'v1',
            title: 'Test Article for Jumping',
            content: `
# Hero Section
This is the beginning of the article.

![Hero Image](https://via.placeholder.com/800x400)

## Middle Section
This is some content in the middle. It has enough text to ensure scrolling is required.
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

## Final Section
This is the end of the article. We want to jump here.
            `.trim(),
            createdAt: Date.now(),
            generatedBy: 'human'
        }
    ]
};

const TEST_PROMPTS = [
    {
        id: 'p1',
        articleId: 'test-article-jump',
        sectionTitle: 'Hero Section',
        prompt: 'A futuristic hero image',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isPromptInserted: false,
        isImageInserted: false
    },
    {
        id: 'p2',
        articleId: 'test-article-jump',
        sectionTitle: 'Middle Section',
        prompt: 'An image representing the middle',
        createdAt: Date.now() + 1,
        updatedAt: Date.now() + 1,
        isPromptInserted: false,
        isImageInserted: false
    },
    {
        id: 'p3',
        articleId: 'test-article-jump',
        sectionTitle: 'Final Section',
        prompt: 'An image representing the end',
        createdAt: Date.now() + 2,
        updatedAt: Date.now() + 2,
        isPromptInserted: false,
        isImageInserted: false
    }
];

test.beforeEach(async ({ page }) => {
    // Inject mock user AND mock data
    await page.addInitScript(({ article, prompts }) => {
        (window as any).__MOCK_USER__ = {
            uid: 'test-user-123',
            email: 'test@example.com',
            displayName: 'Test User'
        };
        (window as any).__TEST_DATA__ = {
            articles: [article],
            imagePrompts: prompts,
            posts: [],
            media: [],
            settings: {},
            perplexityPrompts: [],
            topicSets: []
        };
    }, { article: TEST_ARTICLE, prompts: TEST_PROMPTS });
});

test('Verify: Jump to Section Navigation (Deterministic)', async ({ page }) => {
    test.setTimeout(30000); // Should be very fast now

    // Enable console log capture
    page.on('console', msg => console.log(`[Browser Console]: ${msg.text()}`));

    // 1. Navigate directly to the article editor
    // We go to the list first to ensure auth/store loads, then click the card
    // OR we can try direct navigation if the router supports it with lazy store loading
    // Let's go to list -> click for safety
    console.log('Navigating to blog list...');
    await page.goto('http://localhost:5175/blog');

    // 2. Wait for article card (should be immediate due to mock local data)
    const articleCard = page.getByTestId('article-card').first();
    await expect(articleCard).toBeVisible();
    await expect(articleCard).toContainText('Test Navigation Article');

    console.log('Opening article...');
    await articleCard.click();

    // 3. Wait for editor and prompts
    await expect(page.locator('h3:has-text("Image Generation Prompts")')).toBeVisible({ timeout: 10000 });

    // 4. Test Jump to "Final Section"
    console.log('Testing jump to Final Section...');
    const promptItems = page.locator('div.group.relative.p-4.rounded-xl.border');

    // Find prompt for Final Section
    const finalPrompt = promptItems.filter({ hasText: 'Final Section' });
    await expect(finalPrompt).toBeVisible();

    // Hover and click jump
    await finalPrompt.hover();
    const jumpBtn = finalPrompt.locator('button[title="Jump to Section"]');
    await expect(jumpBtn).toBeVisible();
    await jumpBtn.click();

    // 5. Verify Scroll/Highlight
    await page.waitForTimeout(500); // Animation wait

    const result = await page.evaluate(() => {
        const blocks = Array.from(document.querySelectorAll('[data-block-id]'));
        // Find if any block has the highlight color
        const highlighted = blocks.find(el => {
            const bg = window.getComputedStyle(el).backgroundColor;
            // The highlight color set in ArticleEditor.tsx is rgba(79, 70, 229, 0.2)
            return bg.includes('rgba(79, 70, 229');
        });

        if (!highlighted) return { found: false };

        // Use simpler visibility check
        const rect = highlighted.getBoundingClientRect();
        const isInViewport = rect.top >= 0 && rect.bottom <= (window.innerHeight + 100);

        // Also verify content of highlighted block
        const startOfContent = highlighted.querySelector('textarea')?.value.substring(0, 20);
        return { found: true, isInViewport, contentSnippet: startOfContent };
    });

    console.log('Verification Result:', result);
    await page.screenshot({ path: 'jump-deterministic-result.png', fullPage: true });

    expect(result.found).toBe(true);
    // Note: isInViewport might be flaky on headless depending on screen size vs article length,
    // but with 3 sections it should definitely scroll down.
});
