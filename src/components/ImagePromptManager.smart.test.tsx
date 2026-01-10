import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ImagePromptManager from './ImagePromptManager';
import { useStore } from '../store';
import * as aiService from '../services/aiService';

// Mock the store and services
vi.mock('../store', () => ({
    useStore: vi.fn()
}));

vi.mock('../services/aiService', () => ({
    generateImagePrompts: vi.fn(),
    generateImage: vi.fn(),
    DEFAULT_NANOBANANA_GUIDELINES: 'test guidelines'
}));

vi.mock('../utils/imageUtils', () => ({
    compressImage: vi.fn(async (url) => url)
}));

const mockArticles = [
    { id: 'article-1', topic: 'Main Topic', content: '# Section 1\nContent 1\n# Section 2\nContent 2' }
];

const mockPrompts = [
    {
        id: 'p1',
        articleId: 'article-1',
        sectionTitle: 'Section 1',
        prompt: 'Prompt 1',
        imageUrl: 'http://existing.com/img1.jpg',
        isImageInserted: true,
        version: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        id: 'p2',
        articleId: 'article-1',
        sectionTitle: 'Section 2',
        prompt: 'Prompt 2',
        version: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
    }
];

describe('ImagePromptManager Smart Generation', () => {
    const mockUpdateContent = vi.fn();
    const mockAddImagePrompt = vi.fn();
    const mockUpdateImagePrompt = vi.fn();
    const mockDeleteImagePrompt = vi.fn();
    const mockLoadImagePrompts = vi.fn();
    const mockAddMedia = vi.fn();
    const mockUpdateArticle = vi.fn();

    const defaultMock = {
        articles: mockArticles,
        imagePrompts: mockPrompts,
        settings: { layoutNumImages: 3, layoutIncludeHero: true },
        addImagePrompt: mockAddImagePrompt,
        updateImagePrompt: mockUpdateImagePrompt,
        deleteImagePrompt: mockDeleteImagePrompt,
        loadImagePrompts: mockLoadImagePrompts,
        addMedia: mockAddMedia,
        updateArticle: mockUpdateArticle
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (useStore as any).mockReturnValue(defaultMock);
    });

    it('shows choice modal when generating for a prompt that already has an image', async () => {
        render(
            <ImagePromptManager
                articleId="article-1"
                topic="Test Topic"
                content={mockArticles[0].content}
                onUpdateContent={mockUpdateContent}
            />
        );

        // Find the "Generate Image" button for Section 1 (which has an imageUrl)
        const generateButtons = screen.getAllByTitle('Generate Image');
        fireEvent.click(generateButtons[0]);

        // Should show the modal
        expect(screen.getByText(/An image already exists/)).toBeInTheDocument();
        expect(screen.getByText('Use Existing')).toBeInTheDocument();
        expect(screen.getByText('Regenerate')).toBeInTheDocument();
    });

    it('uses existing image when "Use Existing" is clicked', async () => {
        render(
            <ImagePromptManager
                articleId="article-1"
                topic="Test Topic"
                content={mockArticles[0].content}
                onUpdateContent={mockUpdateContent}
            />
        );

        const generateButtons = screen.getAllByTitle('Generate Image');
        fireEvent.click(generateButtons[0]);

        // Click "Use Existing" (which is the cancel button in our Repurposed ConfirmModal)
        fireEvent.click(screen.getByText('Use Existing'));

        await waitFor(() => {
            // Should NOT call generateImage
            expect(aiService.generateImage).not.toHaveBeenCalled();
            // Should call onUpdateContent with the existing URL
            expect(mockUpdateContent).toHaveBeenCalledWith(expect.stringContaining('http://existing.com/img1.jpg'));
        });
    });

    it('regenerates image when "Regenerate" is clicked', async () => {
        (aiService.generateImage as any).mockResolvedValue({ imageUrl: 'http://new.com/img.jpg' });

        render(
            <ImagePromptManager
                articleId="article-1"
                topic="Test Topic"
                content={mockArticles[0].content}
                onUpdateContent={mockUpdateContent}
            />
        );

        const generateButtons = screen.getAllByTitle('Generate Image');
        fireEvent.click(generateButtons[0]);

        // Click "Regenerate" (Confirm button)
        fireEvent.click(screen.getByText('Regenerate'));

        await waitFor(() => {
            // Should call generateImage
            expect(aiService.generateImage).toHaveBeenCalled();
            // Should update content with new URL (assuming compression etc happened)
            expect(mockUpdateContent).toHaveBeenCalled();
        });
    });

    describe('Bulk Generation', () => {
        beforeEach(() => {
            // Select both prompts
            // In a real component we'd interact with the UI, but here we can just ensure they are selected
            // But wait, the component handles selection via state.
            // I'll need to click the "Select All" button or manually click each prompt checkbox.
        });

        it('shows choice modal during bulk generation if existing images are found', async () => {
            render(
                <ImagePromptManager
                    articleId="article-1"
                    topic="Test Topic"
                    content={mockArticles[0].content}
                    onUpdateContent={mockUpdateContent}
                />
            );

            // Select all
            fireEvent.click(screen.getByText('Select All'));

            // Click "Generate & Insert Images"
            fireEvent.click(screen.getByText('Generate & Insert Images'));

            // Should show the modal for the prompts with images
            expect(screen.getByText(/An image already exists/)).toBeInTheDocument();
        });

        it('applies "Use Existing" to all when "Apply to all" is checked', async () => {
            render(
                <ImagePromptManager
                    articleId="article-1"
                    topic="Test Topic"
                    content={mockArticles[0].content}
                    onUpdateContent={mockUpdateContent}
                />
            );

            fireEvent.click(screen.getByText('Select All'));
            fireEvent.click(screen.getByText('Generate & Insert Images'));

            // Check "Apply to all"
            const checkbox = screen.getByLabelText(/Apply choice to all/);
            fireEvent.click(checkbox);

            // Click "Use Existing"
            fireEvent.click(screen.getByText('Use Existing'));

            await waitFor(() => {
                // Should use existing for p1, generate for p2
                expect(mockUpdateContent).toHaveBeenCalledTimes(1);
                // The final content should have both images inserted
                const finalContent = mockUpdateContent.mock.calls[0][0];
                expect(finalContent).toContain('http://existing.com/img1.jpg');
            });
        });
    });
});
