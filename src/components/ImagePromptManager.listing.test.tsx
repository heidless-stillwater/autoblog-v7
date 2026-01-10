import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ImagePromptManager from './ImagePromptManager';
import { useStore } from '../store';

// Mock the store
vi.mock('../store');

const mockArticles = [
    {
        id: 'article-1',
        topic: 'Test Article',
        content: '# Header 1\nSome text.',
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: 'draft'
    }
];

const mockPrompts = [
    {
        id: 'prompt-1',
        articleId: 'article-1',
        sectionTitle: 'Section 1',
        prompt: 'A beautiful sunset',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        imageUrl: 'https://example.com/sunset.jpg'
    },
    {
        id: 'prompt-2',
        articleId: 'article-1',
        sectionTitle: 'Section 2',
        prompt: 'A cute puppy',
        createdAt: Date.now(),
        updatedAt: Date.now()
        // No imageUrl
    }
];

describe('ImagePromptManager - Prompt Listing', () => {
    const defaultMock = {
        imagePrompts: mockPrompts,
        addImagePrompt: vi.fn(),
        updateImagePrompt: vi.fn(),
        deleteImagePrompt: vi.fn(),
        loadImagePrompts: vi.fn(),
        settings: {
            activePromptPresetId: 'preset-standard-vintage'
        },
        addMedia: vi.fn(),
        articles: mockArticles,
        updateArticle: vi.fn(),
    };

    it('renders thumbnails for prompts with imageUrl', () => {
        (useStore as any).mockReturnValue(defaultMock);

        render(
            <ImagePromptManager
                articleId="article-1"
                topic="Test Topic"
                content={mockArticles[0].content}
                onUpdateContent={vi.fn()}
            />
        );

        const img = screen.getByAltText('Section 1');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', 'https://example.com/sunset.jpg');
    });

    it('renders placeholder for prompts without imageUrl', () => {
        (useStore as any).mockReturnValue(defaultMock);

        render(
            <ImagePromptManager
                articleId="article-1"
                topic="Test Topic"
                content={mockArticles[0].content}
                onUpdateContent={vi.fn()}
            />
        );

        // The placeholder has text "Unset"
        expect(screen.getByText('Unset')).toBeInTheDocument();
    });
});
