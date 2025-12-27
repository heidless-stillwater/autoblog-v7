import { create } from 'zustand';
import type { Post, MediaItem, Settings, Article, ArticleVersion, User } from './types';
import { postsService, mediaService, settingsService, articlesService } from './services/firestoreService';

interface AppState {
    // State
    user: User | null;
    posts: Post[];
    media: MediaItem[];
    settings: Settings;
    articles: Article[];
    isLoading: boolean;

    // User Actions
    setUser: (user: User | null) => void;

    // Data Loading Actions
    loadUserData: (userId: string) => Promise<void>;

    // Post Actions
    addPost: (post: Omit<Post, 'id'>) => Promise<void>;
    updatePost: (id: string, updates: Partial<Post>) => Promise<void>;
    deletePost: (id: string) => Promise<void>;
    importPosts: (posts: Post[]) => void;

    // Media Actions
    addMedia: (item: Omit<MediaItem, 'id'>) => Promise<void>;
    deleteMedia: (id: string) => Promise<void>;

    // Settings Actions
    updateSettings: (updates: Partial<Settings>) => Promise<void>;

    // Loading Actions
    setLoading: (loading: boolean) => void;

    // Article Actions
    addArticle: (article: Omit<Article, 'id'>) => Promise<void>;
    updateArticle: (id: string, updates: Partial<Article>) => Promise<void>;
    deleteArticle: (id: string) => Promise<void>;
    addArticleVersion: (articleId: string, version: ArticleVersion) => Promise<void>;

    // Clear all data on logout
    clearData: () => void;
}

const defaultSettings: Settings = {
    siteTitle: 'My Awesome Blog',
    tagline: 'Just another WordPress clone',
    perplexityApiKey: '',
    theme: 'system',
};

export const useStore = create<AppState>()((set, get) => ({
    // Initial State
    user: null,
    posts: [],
    media: [],
    settings: defaultSettings,
    articles: [],
    isLoading: false,

    // User Actions
    setUser: (user) => set({ user }),

    // Load all user data from Firestore
    loadUserData: async (userId: string) => {
        set({ isLoading: true });
        try {
            const [posts, media, settings, articles] = await Promise.all([
                postsService.getAll(userId),
                mediaService.getAll(userId),
                settingsService.get(userId),
                articlesService.getAll(userId)
            ]);

            set({
                posts,
                media,
                settings: settings || defaultSettings,
                articles,
                isLoading: false
            });
        } catch (error) {
            console.error('Error loading user data:', error);
            set({ isLoading: false });
        }
    },

    // Post Actions
    addPost: async (post) => {
        const { user } = get();
        if (!user) throw new Error('User not authenticated');

        set({ isLoading: true });
        try {
            const id = await postsService.create(user.uid, post);
            const newPost = { ...post, id };
            set((state) => ({
                posts: [newPost, ...state.posts],
                isLoading: false
            }));
        } catch (error) {
            console.error('Error adding post:', error);
            set({ isLoading: false });
            throw error;
        }
    },

    updatePost: async (id, updates) => {
        const { user } = get();
        if (!user) throw new Error('User not authenticated');

        set({ isLoading: true });
        try {
            const updatedData = { ...updates, updatedAt: Date.now() };
            await postsService.update(user.uid, id, updatedData);
            set((state) => ({
                posts: state.posts.map((post) =>
                    post.id === id ? { ...post, ...updatedData } : post
                ),
                isLoading: false
            }));
        } catch (error) {
            console.error('Error updating post:', error);
            set({ isLoading: false });
            throw error;
        }
    },

    deletePost: async (id) => {
        const { user } = get();
        if (!user) throw new Error('User not authenticated');

        set({ isLoading: true });
        try {
            await postsService.delete(user.uid, id);
            set((state) => ({
                posts: state.posts.filter((post) => post.id !== id),
                isLoading: false
            }));
        } catch (error) {
            console.error('Error deleting post:', error);
            set({ isLoading: false });
            throw error;
        }
    },

    importPosts: (newPosts) => set((state) => ({
        posts: [...newPosts, ...state.posts]
    })),

    // Media Actions
    addMedia: async (item) => {
        const { user } = get();
        if (!user) throw new Error('User not authenticated');

        set({ isLoading: true });
        try {
            const id = await mediaService.create(user.uid, item);
            const newItem = { ...item, id };
            set((state) => ({
                media: [newItem, ...state.media],
                isLoading: false
            }));
        } catch (error) {
            console.error('Error adding media:', error);
            set({ isLoading: false });
            throw error;
        }
    },

    deleteMedia: async (id) => {
        const { user } = get();
        if (!user) throw new Error('User not authenticated');

        set({ isLoading: true });
        try {
            await mediaService.delete(user.uid, id);
            set((state) => ({
                media: state.media.filter((item) => item.id !== id),
                isLoading: false
            }));
        } catch (error) {
            console.error('Error deleting media:', error);
            set({ isLoading: false });
            throw error;
        }
    },

    // Settings Actions
    updateSettings: async (updates) => {
        const { user, settings } = get();
        if (!user) throw new Error('User not authenticated');

        set({ isLoading: true });
        try {
            const newSettings = { ...settings, ...updates };
            await settingsService.update(user.uid, newSettings);
            set({ settings: newSettings, isLoading: false });
        } catch (error) {
            console.error('Error updating settings:', error);
            set({ isLoading: false });
            throw error;
        }
    },

    setLoading: (loading) => set({ isLoading: loading }),

    // Article Actions
    addArticle: async (article) => {
        const { user } = get();
        if (!user) throw new Error('User not authenticated');

        set({ isLoading: true });
        try {
            const id = await articlesService.create(user.uid, article);
            const newArticle = { ...article, id };
            set((state) => ({
                articles: [newArticle, ...state.articles],
                isLoading: false
            }));
        } catch (error) {
            console.error('Error adding article:', error);
            set({ isLoading: false });
            throw error;
        }
    },

    updateArticle: async (id, updates) => {
        const { user } = get();
        if (!user) throw new Error('User not authenticated');

        set({ isLoading: true });
        try {
            const updatedData = { ...updates, updatedAt: Date.now() };
            await articlesService.update(user.uid, id, updatedData);
            set((state) => ({
                articles: state.articles.map((article) =>
                    article.id === id ? { ...article, ...updatedData } : article
                ),
                isLoading: false
            }));
        } catch (error) {
            console.error('Error updating article:', error);
            set({ isLoading: false });
            throw error;
        }
    },

    deleteArticle: async (id) => {
        const { user } = get();
        if (!user) throw new Error('User not authenticated');

        set({ isLoading: true });
        try {
            await articlesService.delete(user.uid, id);
            set((state) => ({
                articles: state.articles.filter((article) => article.id !== id),
                isLoading: false
            }));
        } catch (error) {
            console.error('Error deleting article:', error);
            set({ isLoading: false });
            throw error;
        }
    },

    addArticleVersion: async (articleId, version) => {
        const { user } = get();
        if (!user) throw new Error('User not authenticated');

        set({ isLoading: true });
        try {
            const article = get().articles.find(a => a.id === articleId);
            if (!article) throw new Error('Article not found');

            const updatedArticle = {
                currentVersionId: version.id,
                versions: [version, ...article.versions],
                updatedAt: Date.now()
            };

            await articlesService.update(user.uid, articleId, updatedArticle);
            set((state) => ({
                articles: state.articles.map((a) =>
                    a.id === articleId ? { ...a, ...updatedArticle } : a
                ),
                isLoading: false
            }));
        } catch (error) {
            console.error('Error adding article version:', error);
            set({ isLoading: false });
            throw error;
        }
    },

    // Clear all data on logout
    clearData: () => set({
        user: null,
        posts: [],
        media: [],
        settings: defaultSettings,
        articles: [],
        isLoading: false
    })
}));
