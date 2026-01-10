import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ArticleEditor from './ArticleEditor';
import { useStore } from '../store';
import { rotateImage } from '../utils/imageUtils';
import { MemoryRouter } from 'react-router-dom';

// Mock the store
vi.mock('../store', () => ({
    useStore: vi.fn()
}));

// Mock image utils
vi.mock('../utils/imageUtils', () => ({
    rotateImage: vi.fn(() => Promise.resolve('rotated-data-url')),
    compressImage: vi.fn(() => Promise.resolve('compressed-url'))
}));

// Mock other components to avoid deep rendering issues
vi.mock('./MarkdownRenderer', () => ({
    default: ({ content }: { content: string }) => <div data-testid="markdown-renderer">{content}</div>
}));

vi.mock('./ImagePromptManager', () => ({
    default: () => <div data-testid="image-prompt-manager" />
}));

vi.mock('./MediaSelectorModal', () => ({
    default: () => <div data-testid="media-selector-modal" />
}));

vi.mock('./ConfirmModal', () => ({
    default: () => <div data-testid="confirm-modal" />
}));

vi.mock('./ResearchSelector', () => ({
    default: () => <div data-testid="research-selector" />
}));

describe('ArticleEditor - Image Rotation', () => {
    const mockUpdateArticleVersion = vi.fn();
    const mockAddArticleVersion = vi.fn();
    const mockUpdateArticle = vi.fn();

    const mockArticle = {
        id: 'art-1',
        topic: 'Test Topic',
        status: 'draft',
        currentVersionId: 'v1',
        versions: [
            {
                id: 'v1',
                content: '# Header\n\n![test image](original-url)\n\nSome text.',
                title: 'Test Article',
                createdAt: Date.now(),
                generatedBy: 'ai'
            }
        ],
        createdAt: Date.now(),
        updatedAt: Date.now()
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (useStore as any).mockReturnValue({
            settings: { perplexityApiKey: 'test' },
            perplexityPrompts: [],
            updateArticleVersion: mockUpdateArticleVersion,
            addArticleVersion: mockAddArticleVersion,
            updateArticle: mockUpdateArticle,
            syncHeroImages: vi.fn(),
            getResearchByTopic: vi.fn(() => [])
        });
    });

    it('rotates an image when the rotation button is clicked', async () => {
        vi.useFakeTimers();
        render(
            <MemoryRouter>
                <ArticleEditor article={mockArticle as any} />
            </MemoryRouter>
        );

        const rotateButton = screen.getByTitle('Rotate Clockwise');
        fireEvent.click(rotateButton);

        // Handle the async rotation and the debounce timeout
        await vi.runAllTimersAsync();

        expect(rotateImage).toHaveBeenCalledWith('original-url', 90);

        // Verify store update
        expect(mockUpdateArticleVersion).toHaveBeenCalledWith(
            'art-1',
            'v1',
            expect.objectContaining({
                content: expect.stringContaining('rotated-data-url')
            })
        );
        vi.useRealTimers();
    });
});
