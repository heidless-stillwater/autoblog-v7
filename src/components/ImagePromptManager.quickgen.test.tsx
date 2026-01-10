import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ImagePromptManager from './ImagePromptManager';
import { useStore } from '../store';
import { generateImage } from '../services/aiService';

// Mock the store
vi.mock('../store', () => ({
    useStore: vi.fn()
}));

// Mock the AI service
vi.mock('../services/aiService', () => ({
    generateImage: vi.fn(),
    DEFAULT_NANOBANANA_GUIDELINES: 'test guidelines'
}));

// Mock image utils
vi.mock('../utils/imageUtils', () => ({
    compressImage: vi.fn(() => Promise.resolve('compressed-url'))
}));

describe('ImagePromptManager - Quick Gen Enhancements', () => {
    const mockAddImagePrompt = vi.fn();
    const mockAddMedia = vi.fn();
    const mockUpdateContent = vi.fn();

    const defaultProps = {
        articleId: 'art-1',
        topic: 'Test Topic',
        content: '# Header 1\nContent 1\n# Header 2\nContent 2',
        onUpdateContent: mockUpdateContent
    };

    const mockPrompts = [
        { id: '1', articleId: 'art-1', sectionTitle: 'Hero Image', prompt: 'hero', isHero: true, createdAt: 100 },
        { id: '2', articleId: 'art-1', sectionTitle: 'Header 1', prompt: 'h1', createdAt: 200 }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        (useStore as any).mockReturnValue({
            imagePrompts: mockPrompts,
            addImagePrompt: mockAddImagePrompt,
            updateImagePrompt: vi.fn(),
            deleteImagePrompt: vi.fn(),
            loadImagePrompts: vi.fn(),
            settings: {},
            addMedia: mockAddMedia,
            articles: [{ id: 'art-1', topic: 'Test Topic' }],
            updateArticle: vi.fn()
        });
    });

    it('adds a prompt without generation when "Generate Image Now" is toggled off', async () => {
        render(<ImagePromptManager {...defaultProps} />);

        // Find input and type prompt
        const input = screen.getByPlaceholderText(/Enter a custom prompt/i);
        fireEvent.change(input, { target: { value: 'New Custom Prompt' } });

        // Toggle off "Generate Image Now"
        const toggle = screen.getByText(/Generate Image Now/i);
        fireEvent.click(toggle);

        // Button text should change
        const saveButton = screen.getByText(/Save Prompt/i);
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(mockAddImagePrompt).toHaveBeenCalledWith(expect.objectContaining({
                prompt: 'New Custom Prompt',
                isImageInserted: false
            }));
        });

        expect(generateImage).not.toHaveBeenCalled();
        expect(mockUpdateContent).not.toHaveBeenCalled();
    });

    it('sorts prompts correctly based on position', () => {
        // We'll test the sorting by checking the order in the list
        // Custom prompts:
        // Top: -50
        // Hero: -100
        // Header 1: matches index in content
        // Bottom: content.length + 1000

        const testPrompts = [
            { id: 'p-bottom', articleId: 'art-1', sectionTitle: 'Custom (bottom)', prompt: 'bp', createdAt: 500 },
            { id: 'p-top', articleId: 'art-1', sectionTitle: 'Custom (top)', prompt: 'tp', createdAt: 400 },
            { id: 'p-hero', articleId: 'art-1', sectionTitle: 'Hero Image', prompt: 'hp', isHero: true, createdAt: 300 },
            { id: 'p-h2', articleId: 'art-1', sectionTitle: 'Custom: Header 2', prompt: 'h2p', createdAt: 600 }
        ];

        (useStore as any).mockReturnValue({
            imagePrompts: testPrompts,
            addImagePrompt: mockAddImagePrompt,
            updateImagePrompt: vi.fn(),
            deleteImagePrompt: vi.fn(),
            loadImagePrompts: vi.fn(),
            settings: {},
            addMedia: mockAddMedia,
            articles: [{ id: 'art-1', topic: 'Test Topic' }],
            updateArticle: vi.fn()
        });

        render(<ImagePromptManager {...defaultProps} />);

        // Check orders of prompts in the UI
        const promptElements = screen.getAllByRole('heading', { level: 4 });
        // Expected order: Hero Image, Custom (top), Custom: Header 2, Custom (bottom)
        expect(promptElements[0].textContent).toContain('Hero Image');
        expect(promptElements[1].textContent).toContain('Custom (top)');
        expect(promptElements[2].textContent).toContain('Custom: Header 2');
        expect(promptElements[3].textContent).toContain('Custom (bottom)');
    });
});
