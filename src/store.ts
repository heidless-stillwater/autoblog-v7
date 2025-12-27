import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Post, MediaItem, Settings, Article, ArticleVersion } from './types';

interface AppState {
    posts: Post[];
    media: MediaItem[];
    settings: Settings;
    articles: Article[];
    isLoading: boolean;

    // Actions
    addPost: (post: Post) => void;
    updatePost: (id: string, updates: Partial<Post>) => void;
    deletePost: (id: string) => void;
    importPosts: (posts: Post[]) => void;

    addMedia: (item: MediaItem) => void;
    deleteMedia: (id: string) => void;

    updateSettings: (updates: Partial<Settings>) => void;
    setLoading: (loading: boolean) => void;

    // Article Actions
    addArticle: (article: Article) => void;
    updateArticle: (id: string, updates: Partial<Article>) => void;
    deleteArticle: (id: string) => void;
    addArticleVersion: (articleId: string, version: ArticleVersion) => void;
}

const defaultSettings: Settings = {
    siteTitle: 'My Awesome Blog',
    tagline: 'Just another WordPress clone',
    perplexityApiKey: '',
    theme: 'system',
};

export const useStore = create<AppState>()(
    persist(
        (set) => ({
            posts: [],
            media: [],
            settings: defaultSettings,
            articles: [],
            isLoading: false,

            addPost: (post) => set((state) => ({ posts: [post, ...state.posts] })),

            updatePost: (id, updates) => set((state) => ({
                posts: state.posts.map((post) =>
                    post.id === id ? { ...post, ...updates, updatedAt: Date.now() } : post
                ),
            })),

            deletePost: (id) => set((state) => ({
                posts: state.posts.filter((post) => post.id !== id),
            })),

            importPosts: (newPosts) => set((state) => ({
                posts: [...newPosts, ...state.posts]
            })),

            addMedia: (item) => set((state) => ({ media: [item, ...state.media] })),

            deleteMedia: (id) => set((state) => ({
                media: state.media.filter((item) => item.id !== id),
            })),

            updateSettings: (updates) => set((state) => ({
                settings: { ...state.settings, ...updates },
            })),

            setLoading: (loading) => set({ isLoading: loading }),

            // Article Actions
            addArticle: (article) => set((state) => ({ articles: [article, ...state.articles] })),

            updateArticle: (id, updates) => set((state) => ({
                articles: state.articles.map((article) =>
                    article.id === id ? { ...article, ...updates, updatedAt: Date.now() } : article
                )
            })),

            deleteArticle: (id) => set((state) => ({
                articles: state.articles.filter((article) => article.id !== id)
            })),

            addArticleVersion: (articleId, version) => set((state) => ({
                articles: state.articles.map((article) =>
                    article.id === articleId
                        ? {
                            ...article,
                            currentVersionId: version.id,
                            versions: [version, ...article.versions],
                            updatedAt: Date.now()
                        }
                        : article
                )
            })),
        }),
        {
            name: 'wp-clone-storage',
            partialize: (state) => ({
                posts: state.posts,
                media: state.media,
                settings: state.settings,
                articles: state.articles
            }),
        }
    )
);
