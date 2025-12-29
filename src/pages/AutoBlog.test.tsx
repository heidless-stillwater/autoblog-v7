import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AutoBlog from './AutoBlog';
import { useStore } from '../store';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Mock dependencies
vi.mock('../store');
vi.mock('../components/ArticleEditor', () => ({
    default: ({ article }: { article: any }) => <div data-testid="article-editor">{article.topic}</div>
}));

// Mock the components used in AutoBlog list view to simplify testing
vi.mock('../components/AutoBlogGenerator', () => ({
    default: () => <div>AutoBlogGenerator</div>
}));
vi.mock('../components/TopicSelector', () => ({
    default: () => <div>TopicSelector</div>
}));
vi.mock('../components/SEOKeywordsModal', () => ({
    default: () => <div>SEOKeywordsModal</div>
}));

describe('AutoBlog Component', () => {
    // const mockNavigate = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock useNavigate from react-router-dom if needed, 
        // but MemoryRouter usually handles it. 
        // We can spy on console to keep output clean
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    it('shows loading spinner when not initialized', () => {
        // Setup store mock
        (useStore as any).mockReturnValue({
            articles: [],
            isInitialized: false,
            isLoading: false,
            deleteArticle: vi.fn(),
            syncHeroImages: vi.fn(),
            settings: {},
            addArticleVersion: vi.fn(),
            updateArticle: vi.fn()
        });

        render(
            <MemoryRouter initialEntries={['/blog/123']}>
                <Routes>
                    <Route path="/blog/:id" element={<AutoBlog />} />
                </Routes>
            </MemoryRouter>
        );

        // Check for spinner (based on class or role)
        // The spinner is a div with animate-spin class
        const spinner = document.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();

        // Editor should NOT be rendered
        expect(screen.queryByTestId('article-editor')).not.toBeInTheDocument();
    });

    it('renders editor when initialized and article exists', () => {
        const mockArticle = { id: '123', topic: 'Test Topic' };

        (useStore as any).mockReturnValue({
            articles: [mockArticle],
            isInitialized: true,
            isLoading: false, // Even if loading is false, it should render
            deleteArticle: vi.fn(),
            addPost: vi.fn(),
            syncHeroImages: vi.fn(),
            settings: {},
            addArticleVersion: vi.fn()
        });

        render(
            <MemoryRouter initialEntries={['/blog/123']}>
                <Routes>
                    <Route path="/blog/:id" element={<AutoBlog />} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByTestId('article-editor')).toBeInTheDocument();
        expect(screen.getByText('Test Topic')).toBeInTheDocument();
    });

    it('renders editor even if loading (infinite loop regression test)', () => {
        // This verifies the fix for the infinite unmount loop
        // It should render even if isLoading is true, AS LONG AS isInitialized is true
        const mockArticle = { id: '123', topic: 'Test Topic' };

        (useStore as any).mockReturnValue({
            articles: [mockArticle],
            isInitialized: true,
            isLoading: true, // Simulate the state that caused flickering
            deleteArticle: vi.fn(),
            addPost: vi.fn(),
            syncHeroImages: vi.fn(),
            settings: {},
            addArticleVersion: vi.fn()
        });

        render(
            <MemoryRouter initialEntries={['/blog/123']}>
                <Routes>
                    <Route path="/blog/:id" element={<AutoBlog />} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByTestId('article-editor')).toBeInTheDocument();
    });

    it('redirects to blog list if initialized but article not found', async () => {
        (useStore as any).mockReturnValue({
            articles: [],
            isInitialized: true,
            isLoading: false,
            deleteArticle: vi.fn(),
            addPost: vi.fn(),
            syncHeroImages: vi.fn(),
            settings: {},
            addArticleVersion: vi.fn()
        });

        render(
            <MemoryRouter initialEntries={['/blog/999']}>
                <Routes>
                    <Route path="/blog/:id" element={<AutoBlog />} />
                    <Route path="/blog" element={<div>Blog List</div>} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Blog List')).toBeInTheDocument();
        });
    });


    it('toggles article status when publish button is clicked', async () => {
        const mockArticle = {
            id: '123',
            topic: 'Test Topic',
            status: 'draft',
            createdAt: Date.now(),
            versions: [{ id: 'v1', title: 'Title', content: 'Content' }],
            currentVersionId: 'v1'
        };
        const updateArticleMock = vi.fn();

        (useStore as any).mockReturnValue({
            articles: [mockArticle],
            isInitialized: true,
            isLoading: false,
            deleteArticle: vi.fn(),
            syncHeroImages: vi.fn(),
            settings: {},
            addArticleVersion: vi.fn(),
            updateArticle: updateArticleMock
        });

        render(
            <MemoryRouter initialEntries={['/blog']}>
                <Routes>
                    <Route path="/blog" element={<AutoBlog />} />
                </Routes>
            </MemoryRouter>
        );

        // Find publish button and click it
        const publishBtn = screen.getByText('Publish');
        expect(publishBtn).toBeInTheDocument();

        publishBtn.click(); // Using click() directly or fireEvent.click

        await waitFor(() => {
            expect(updateArticleMock).toHaveBeenCalledWith('123', { status: 'published' });
        });
    });
});
