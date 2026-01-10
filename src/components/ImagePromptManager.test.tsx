import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ImagePromptManager from './ImagePromptManager';
import { useStore } from '../store';

// Mock the store
vi.mock('../store');

const mockArticles = [
    {
        id: 'article-1',
        topic: 'Test Article',
        content: '# Header 1\nSome text.\n## Header 2\nMore text.\n### Header 3\nEnd.',
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: 'draft'
    }
];

describe('ImagePromptManager - Quick Generate', () => {
    const defaultMock = {
        imagePrompts: [],
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

    it('extracts headers from content correctly in the dropdown', () => {
        (useStore as any).mockReturnValue(defaultMock);

        render(
            <ImagePromptManager
                articleId="article-1"
                topic="Test Topic"
                content={mockArticles[0].content}
                onUpdateContent={vi.fn()}
            />
        );

        // Check if headers are in the dropdown
        expect(screen.getByText('• Header 1')).toBeInTheDocument();
        expect(screen.getByText('•• Header 2')).toBeInTheDocument();
        expect(screen.getByText('••• Header 3')).toBeInTheDocument();
    });

    it('updates genPromptCustom state on input', () => {
        (useStore as any).mockReturnValue(defaultMock);

        render(
            <ImagePromptManager
                articleId="article-1"
                topic="Test Topic"
                content={mockArticles[0].content}
                onUpdateContent={vi.fn()}
            />
        );

        const input = screen.getByPlaceholderText('Enter a custom prompt for this article...');
        fireEvent.change(input, { target: { value: 'A cute cat' } });
        expect(input).toHaveValue('A cute cat');
    });

    it('disables Quick Gen button when input is empty', () => {
        (useStore as any).mockReturnValue(defaultMock);

        render(
            <ImagePromptManager
                articleId="article-1"
                topic="Test Topic"
                content={mockArticles[0].content}
                onUpdateContent={vi.fn()}
            />
        );

        const button = screen.getByRole('button', { name: /Quick Gen/i });
        expect(button).toBeDisabled();

        const input = screen.getByPlaceholderText('Enter a custom prompt for this article...');
        fireEvent.change(input, { target: { value: 'A cute cat' } });
        expect(button).not.toBeDisabled();
    });

    it('toggles insertion direction (above/below)', () => {
        (useStore as any).mockReturnValue(defaultMock);

        render(
            <ImagePromptManager
                articleId="article-1"
                topic="Test Topic"
                content={mockArticles[0].content}
                onUpdateContent={vi.fn()}
            />
        );

        const aboveBtn = screen.getByTitle('Position Above');
        const belowBtn = screen.getByTitle('Position Below');

        // Initial state is 'above' (bg-indigo-500)
        expect(aboveBtn).toHaveClass('bg-indigo-500');
        expect(belowBtn).not.toHaveClass('bg-indigo-500');

        // Click Below
        fireEvent.click(belowBtn);
        expect(belowBtn).toHaveClass('bg-indigo-500');
        expect(aboveBtn).not.toHaveClass('bg-indigo-500');

        // Click Above again
        fireEvent.click(aboveBtn);
        expect(aboveBtn).toHaveClass('bg-indigo-500');
        expect(belowBtn).not.toHaveClass('bg-indigo-500');
    });
});
