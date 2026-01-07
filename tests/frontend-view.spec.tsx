import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import FrontendBlogList from '../src/pages/FrontendBlogList';
import FrontendArticleView from '../src/pages/FrontendArticleView';
import { useStore } from '../src/store';
import { useAuth } from '../src/contexts/AuthContext';
import React from 'react';
import '@testing-library/jest-dom';

// Mock dependencies
vi.mock('../src/store');
vi.mock('../src/contexts/AuthContext');

// Mock Data
const mockPublicContent = [
    {
        id: 'post-1',
        title: 'Live Post',
        status: 'live',
        createdAt: 1000,
        tags: [],
        attachments: []
    },
    {
        id: 'article-1',
        topic: 'Published Article',
        status: 'published',
        createdAt: 2000,
        currentVersionId: 'v1',
        versions: [{ id: 'v1', content: 'Article Content' }]
    }
];

describe('Frontend View', () => {
    beforeEach(() => {
        (useStore as any).mockReturnValue({
            publicContent: mockPublicContent,
            loadPublicContent: vi.fn(),
            toggleFavorite: vi.fn(),
            isLoading: false
        });
        (useAuth as any).mockReturnValue({
            user: { uid: 'u1', favorites: [] }
        });
    });

    it('renders unified feed with both Articles and Posts', () => {
        render(
            <MemoryRouter>
                <FrontendBlogList />
            </MemoryRouter>
        );

        // Check if both titles appear (Note: Featured post is likely the first one in the list logic, typically sorted by date)
        // In Store mock they are: Post (1000), Article (2000). Article is newer.
        // FrontendBlogList sorts? No, usage assumes pre-sorted by service.
        // Logic: featuredPost = publicContent[0]. Rest are grid.

        expect(screen.getByText('Live Post')).toBeInTheDocument();
        expect(screen.getByText('Published Article')).toBeInTheDocument();
    });

    it('renders Article view correctly', () => {
        render(
            <MemoryRouter initialEntries={['/article/article-1']}>
                <Routes>
                    <Route path="/article/:id" element={<FrontendArticleView />} />
                </Routes>
            </MemoryRouter>
        );
        expect(screen.getByText('Published Article')).toBeInTheDocument();
    });

    it('renders Post view correctly', () => {
        render(
            <MemoryRouter initialEntries={['/article/post-1']}>
                <Routes>
                    <Route path="/article/:id" element={<FrontendArticleView />} />
                </Routes>
            </MemoryRouter>
        );
        expect(screen.getByText('Live Post')).toBeInTheDocument();
    });
});
