import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Post, MediaItem, Settings } from './types';

interface AppState {
    posts: Post[];
    media: MediaItem[];
    settings: Settings;
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
        }),
        {
            name: 'wp-clone-storage',
            partialize: (state) => ({
                posts: state.posts,
                media: state.media,
                settings: state.settings
            }), // only persist data, not UI state like isLoading
        }
    )
);
