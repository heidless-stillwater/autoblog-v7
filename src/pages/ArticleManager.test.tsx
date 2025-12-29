import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ArticleManager from './ArticleManager';
import { useStore } from '../store';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Mock dependencies
vi.mock('../store');
vi.mock('../components/ArticleEditor', () => ({
    default: ({ article }: { article: any }) => <div data-testid="article-editor">{article.topic}</div>
}));
vi.mock('../components/SEOKeywordsModal', () => ({
    default: () => <div>SEOKeywordsModal</div>
}));
vi.mock('../services/aiService', () => ({
    rewriteToStyle: vi.fn(),
    optimizeForSEO: vi.fn()
}));

describe('ArticleManager Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    it('shows loading spinner when not initialized', () => {
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
            <MemoryRouter initialEntries={['/admin/articles/123']}>
                <Routes>
                    <Route path="/admin/articles/:id" element={<ArticleManager />} />
                </Routes>
            </MemoryRouter>
        );

        const spinner = document.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();
        expect(screen.queryByTestId('article-editor')).not.toBeInTheDocument();
    });

    it('renders editor when initialized and article exists', () => {
        const mockArticle = { id: '123', topic: 'Test Topic' };

        (useStore as any).mockReturnValue({
            articles: [mockArticle],
            isInitialized: true,
            isLoading: false,
            deleteArticle: vi.fn(),
            syncHeroImages: vi.fn(),
            settings: {},
            addArticleVersion: vi.fn()
        });

        render(
            <MemoryRouter initialEntries={['/admin/articles/123']}>
                <Routes>
                    <Route path="/admin/articles/:id" element={<ArticleManager />} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByTestId('article-editor')).toBeInTheDocument();
        expect(screen.getByText('Test Topic')).toBeInTheDocument();
    });

    it('redirects to article list if initialized but article not found', async () => {
        (useStore as any).mockReturnValue({
            articles: [],
            isInitialized: true,
            isLoading: false,
            deleteArticle: vi.fn(),
            syncHeroImages: vi.fn(),
            settings: {},
            addArticleVersion: vi.fn()
        });

        render(
            <MemoryRouter initialEntries={['/admin/articles/999']}>
                <Routes>
                    <Route path="/admin/articles/:id" element={<ArticleManager />} />
                    <Route path="/admin/articles" element={<div>Article List</div>} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Article List')).toBeInTheDocument();
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
            <MemoryRouter initialEntries={['/admin/articles']}>
                <Routes>
                    <Route path="/admin/articles" element={<ArticleManager />} />
                </Routes>
            </MemoryRouter>
        );

        // Find publish button and click it
        const publishBtn = screen.getByText('Publish');
        expect(publishBtn).toBeInTheDocument();

        fireEvent.click(publishBtn);

        await waitFor(() => {
            expect(updateArticleMock).toHaveBeenCalledWith('123', { status: 'published' });
        });
    });
});
