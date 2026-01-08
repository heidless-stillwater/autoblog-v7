import { create } from 'zustand';
import type { Post, MediaItem, Settings, Article, ArticleVersion, User, PerplexityPrompt, TopicSet, ImagePrompt, PublicPost, TopicQueueSnapshot, GenHistory } from './types';
import { postsService, mediaService, settingsService, articlesService, topicSetsService, imagePromptsService, publicService, usersService, topicQueueService, genHistoryService } from './services/firestoreService';
import { perplexityService } from './services/perplexityService';

interface AppState {
    // State
    user: User | null;
    posts: Post[];
    media: MediaItem[];
    settings: Settings;
    articles: Article[];
    perplexityPrompts: PerplexityPrompt[];
    imagePrompts: ImagePrompt[];
    isLoading: boolean;
    isInitialized: boolean;

    // Public Content State
    publicContent: PublicPost[];

    // User Actions
    setUser: (user: User | null) => void;
    toggleFavorite: (postId: string) => Promise<void>;

    // Data Loading Actions
    loadUserData: (userId: string) => Promise<void>;
    loadPublicContent: () => Promise<void>;

    // -- REST OF INTERFACE --

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
    loadArticles: () => Promise<void>;
    addArticle: (article: Omit<Article, 'id'>) => Promise<void>;
    updateArticle: (id: string, updates: Partial<Article>) => Promise<void>;
    deleteArticle: (id: string) => Promise<void>;
    addArticleVersion: (articleId: string, version: ArticleVersion) => Promise<void>;
    updateArticleVersion: (articleId: string, versionId: string, updates: Partial<ArticleVersion>) => Promise<void>;
    syncHeroImages: (articleIds?: string[], force?: boolean) => Promise<{ updated: number; failed: number }>;

    // Research Actions
    loadResearch: (userId: string) => Promise<void>;
    addResearch: (research: Omit<PerplexityPrompt, 'id'>) => Promise<string>;
    getResearchByTopic: (topic: string) => PerplexityPrompt[];

    // Topic Set Actions
    topicSets: TopicSet[];
    addTopicSet: (topicSet: Omit<TopicSet, 'id'>) => Promise<void>;
    deleteTopicSet: (id: string) => Promise<void>;
    importTopicSets: (topicSets: TopicSet[]) => Promise<void>;

    // Image Prompt Actions
    addImagePrompt: (prompt: Omit<ImagePrompt, 'id'>) => Promise<void>;
    updateImagePrompt: (id: string, updates: Partial<ImagePrompt>) => Promise<void>;
    deleteImagePrompt: (id: string) => Promise<void>;
    loadImagePrompts: (articleId?: string) => Promise<void>;

    // Topic Queue Snapshots
    topicQueueSnapshots: TopicQueueSnapshot[];
    loadTopicQueueSnapshots: () => Promise<void>;
    saveTopicQueueSnapshot: (queue: string[], name?: string, genDate?: number) => Promise<void>;
    updateTopicQueueSnapshot: (id: string, queue: string[], genDate?: number) => Promise<void>;
    deleteTopicQueueSnapshot: (id: string) => Promise<void>;

    // Real-time Queue Logs
    queueLogs: any[];
    subscribeToQueueLogs: () => void;
    unsubscribeFromQueueLogs: () => void;

    // Generation History Actions
    genHistory: GenHistory[];
    loadGenHistory: () => Promise<void>;
    addGenHistory: (record: Omit<GenHistory, 'id'>) => Promise<string>;
    updateGenHistory: (id: string, updates: Partial<GenHistory>) => Promise<void>;
    deleteGenHistory: (id: string) => Promise<void>;
    clearGenHistory: () => Promise<void>;

    // Clear all data on logout
    clearData: () => void;
}

const defaultSettings: Settings = {
    siteTitle: 'My Awesome Blog',
    tagline: 'Just another WordPress clone',
    perplexityApiKey: '',
    geminiApiKey: 'AIzaSyBmzqll55QHjuxw6IaWb7EjZsNs3TvRTmg',
    braveApiKey: '',
    claudeApiKey: '',
    sudowriteApiKey: '',
    novelcrafterApiKey: '',
    characterAiApiKey: '',
    chatgptApiKey: '',
    iaskAiApiKey: '',
    perplexityModel: 'sonar',
    theme: 'system',
    customSeeds: [],
    topicQueue: [],
    queueProcessInterval: 1,
    imageStylePresets: [],
    promptPresets: [],
    articleDefaultWordCount: 4000,
    layoutPresets: [
        {
            id: 'preset-base-layout-0',
            name: 'Base Layout 0',
            imageCount: 3,
            includeHero: true,
            placementInstructions: '* If hero image is to be used then ONLY show Hero image in the Hero section of the Article above the Title. Do not display the Hero anywher else. Do not display the title or Hero within the Article.\n* I want the images to be spread as evenly across the article. If in doubt then bias the placement to the top half of the article',
            createdAt: 0
        }
    ],
    activeLayoutPresetId: 'preset-base-layout-0',
    layoutNumImages: 3,
    layoutIncludeHero: true,
    layoutInstructions: '* If hero image is to be used then ONLY show Hero image in the Hero section of the Article above the Title. Do not display the Hero anywher else. Do not display the title or Hero within the Article.\n* I want the images to be spread as evenly across the article. If in doubt then bias the placement to the top half of the article',
};

export const useStore = create<AppState>()((set, get) => ({
    // Initial State
    user: null,
    posts: [],
    media: [],
    settings: defaultSettings,
    articles: [],
    perplexityPrompts: [],
    imagePrompts: [],
    topicQueueSnapshots: [],
    queueLogs: [],
    genHistory: [],
    isLoading: false,
    isInitialized: false,

    // User Actions
    setUser: (user) => set({ user }),

    // Load all user data from Firestore
    loadUserData: async (userId: string) => {
        set({ isLoading: true });

        // Check for injected test data
        if (typeof window !== 'undefined' && (window as any).__TEST_DATA__) {
            const testData = (window as any).__TEST_DATA__;
            console.log('[Store] Loading injected test data:', testData);
            set({
                isLoading: false,
                isInitialized: true,
                posts: testData.posts || [],
                media: testData.media || [],
                settings: { ...defaultSettings, ...(testData.settings || {}) },
                articles: testData.articles || [],
                perplexityPrompts: testData.perplexityPrompts || [],
                topicSets: testData.topicSets || [],
                imagePrompts: testData.imagePrompts || []
            });
            return;
        }

        try {
            const [posts, media, settings, articles, perplexityPrompts, topicSets, imagePrompts, genHistory] = await Promise.all([
                postsService.getAll(userId),
                mediaService.getAll(userId),
                settingsService.get(userId),
                articlesService.getAll(userId),
                perplexityService.getAllResearch(userId),
                topicSetsService.getAll(userId),
                imagePromptsService.getAll(userId),
                genHistoryService.getAll(userId)
            ]);

            set({
                posts,
                media,
                settings: settings ? { ...defaultSettings, ...settings } : defaultSettings,
                articles,
                perplexityPrompts,
                topicSets,
                imagePrompts,
                genHistory,
                isLoading: false,
                isInitialized: true
            });
        } catch (error) {
            console.error('Error loading user data:', error);
            set({ isLoading: false, isInitialized: true });
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
    loadArticles: async () => {
        const { user } = get();
        if (!user) return;
        set({ isLoading: true });
        try {
            const articles = await articlesService.getAll(user.uid);
            set({ articles, isLoading: false });
        } catch (error) {
            console.error('Error loading articles:', error);
            set({ isLoading: false });
        }
    },

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

    updateArticleVersion: async (articleId, versionId, updates) => {
        const { user } = get();
        if (!user) throw new Error('User not authenticated');

        try {
            const article = get().articles.find(a => a.id === articleId);
            if (!article) throw new Error('Article not found');

            const updatedVersions = article.versions.map(v =>
                v.id === versionId ? { ...v, ...updates } : v
            );

            await articlesService.update(user.uid, articleId, {
                versions: updatedVersions,
                updatedAt: Date.now()
            });

            set((state) => ({
                articles: state.articles.map((a) =>
                    a.id === articleId ? { ...a, versions: updatedVersions, updatedAt: Date.now() } : a
                )
            }));
        } catch (error) {
            console.error('Error updating article version:', error);
            throw error;
        }
    },

    // Public Actions
    publicContent: [] as PublicPost[],

    loadPublicContent: async () => {
        set({ isLoading: true });
        try {
            const publicContent = await publicService.getPublicContent();
            set({ publicContent, isLoading: false });
        } catch (error: any) {
            console.error('Error loading public content:', error);
            if (error?.message?.includes('requires an index') || error?.code === 'failed-precondition') {
                console.error('MISSING FIRESTORE INDEX: Check console for the link to create the index.');
            }
            set({ isLoading: false });
        }
    },

    toggleFavorite: async (postId: string) => {
        const { user } = get();
        if (!user) return; // Can't favorite if not logged in

        // Optimistic update
        const currentFavorites = user.favorites || [];
        const isFavorited = currentFavorites.includes(postId);
        const newFavorites = isFavorited
            ? currentFavorites.filter(id => id !== postId)
            : [...currentFavorites, postId];

        const updatedUser = { ...user, favorites: newFavorites };
        set({ user: updatedUser });

        try {
            await usersService.updateFavorites(user.uid, newFavorites);
        } catch (error) {
            console.error('Error updating favorites:', error);
            // Revert on error
            set({ user });
        }
    },

    syncHeroImages: async (articleIds, force = false) => {
        const { user, articles } = get();
        if (!user) throw new Error('User not authenticated');

        const targetArticles = articleIds
            ? articles.filter(a => articleIds.includes(a.id))
            : articles;

        let updated = 0;
        let failed = 0;

        for (const article of targetArticles) {
            // Only sync if hero image is missing/empty 
            // Handle undefined, null, empty string, whitespace, or stringified null/undefined
            const currentHero = article.heroImage;
            const isMissing = !currentHero ||
                (typeof currentHero === 'string' && (
                    currentHero.trim() === '' ||
                    currentHero === 'null' ||
                    currentHero === 'undefined'
                ));

            if (isMissing || force) {
                const currentVersion = article.versions.find(v => v.id === article.currentVersionId);
                if (!currentVersion) continue;

                // Match first markdown image: ![alt](url)
                // Use [^\]] for alt and [^)] for url to be more robust with long data URIs and complex alt text
                const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/u;
                const match = currentVersion.content.match(imgRegex);

                if (match && match[2]) {
                    const firstImageUrl = match[2];
                    try {
                        await articlesService.update(user.uid, article.id, {
                            heroImage: firstImageUrl,
                            updatedAt: Date.now()
                        });

                        set((state) => ({
                            articles: state.articles.map((a) =>
                                a.id === article.id ? { ...a, heroImage: firstImageUrl, updatedAt: Date.now() } : a
                            )
                        }));
                        updated++;
                    } catch (error) {
                        console.error(`[SyncHero] Failed to update article ${article.id}:`, error);
                        failed++;
                    }
                }
            }
        }

        return { updated, failed };
    },

    // Research Actions
    loadResearch: async (userId: string) => {
        set({ isLoading: true });
        try {
            const perplexityPrompts = await perplexityService.getAllResearch(userId);
            set({ perplexityPrompts, isLoading: false });
        } catch (error) {
            console.error('Error loading research:', error);
            set({ isLoading: false });
        }
    },

    addResearch: async (research) => {
        const { user } = get();
        if (!user) throw new Error('User not authenticated');

        set({ isLoading: true });
        try {
            const id = await perplexityService.createResearch(
                user.uid,
                research.prompt,
                research.response,
                research.topic
            );
            const newResearch = { ...research, id };
            set((state) => ({
                perplexityPrompts: [newResearch, ...state.perplexityPrompts],
                isLoading: false
            }));
            return id;
        } catch (error) {
            console.error('Error adding research:', error);
            set({ isLoading: false });
            throw error;
        }
    },

    getResearchByTopic: (topic: string) => {
        const { perplexityPrompts } = get();
        return perplexityPrompts
            .filter(r => r.topic === topic)
            .sort((a, b) => b.revisionId - a.revisionId);
    },

    // Topic Set Actions
    topicSets: [],

    addTopicSet: async (topicSet) => {
        const { user } = get();
        if (!user) throw new Error('User not authenticated');

        set({ isLoading: true });
        try {
            // Check if seed already exists
            const existing = get().topicSets.find(ts => ts.seed.toLowerCase() === topicSet.seed.toLowerCase());
            if (existing) {
                // Determine if we are adding new topics or replacing?
                // For now, let's treat it as a replace/update of the existing seed's topics
                // or we can append. The requirement says "manage individual topics".
                // Simple implementation: Replace topics if seed exists, or merge unique ones.
                const mergedTopics = Array.from(new Set([...existing.topics, ...topicSet.topics]));
                await topicSetsService.update(user.uid, existing.id, { topics: mergedTopics, createdAt: Date.now() });

                set(state => ({
                    topicSets: state.topicSets.map(ts => ts.id === existing.id ? { ...ts, topics: mergedTopics, createdAt: Date.now() } : ts),
                    isLoading: false
                }));
            } else {
                const id = await topicSetsService.create(user.uid, topicSet);
                const newSet = { ...topicSet, id };
                set(state => ({
                    topicSets: [newSet, ...state.topicSets],
                    isLoading: false
                }));
            }
        } catch (error) {
            console.error('Error adding topic set:', error);
            set({ isLoading: false });
            throw error;
        }
    },

    deleteTopicSet: async (id) => {
        const { user } = get();
        if (!user) throw new Error('User not authenticated');

        set({ isLoading: true });
        try {
            await topicSetsService.delete(user.uid, id);
            set(state => ({
                topicSets: state.topicSets.filter(ts => ts.id !== id),
                isLoading: false
            }));
        } catch (error) {
            console.error('Error deleting topic set:', error);
            set({ isLoading: false });
            throw error;
        }
    },

    importTopicSets: async (newTopicSets) => {
        const { user } = get();
        if (!user) throw new Error('User not authenticated');

        set({ isLoading: true });
        try {
            // Process each imported set: if seed exists, merge; if new, create.
            const promises = newTopicSets.map(async (ts) => {
                const existing = get().topicSets.find(existing => existing.seed.toLowerCase() === ts.seed.toLowerCase());
                if (existing) {
                    const mergedTopics = Array.from(new Set([...existing.topics, ...ts.topics]));
                    await topicSetsService.update(user.uid, existing.id, { topics: mergedTopics });
                    return;
                } else {
                    // Remove ID from import if it conflicts, rely on firestore gen for new docs
                    // But we might want to keep ID if we are doing a full restore.
                    // Let's create new for safety to valid IDs.
                    const { id, ...rest } = ts;
                    await topicSetsService.create(user.uid, { ...rest, createdAt: Date.now() });
                }
            });

            await Promise.all(promises);

            // Reload all to sync state
            const freshSets = await topicSetsService.getAll(user.uid);
            set({ topicSets: freshSets, isLoading: false });

        } catch (error) {
            console.error('Error importing topic sets:', error);
            set({ isLoading: false });
            throw error;
        }
    },

    // Image Prompt Actions
    addImagePrompt: async (prompt) => {
        const { user } = get();
        if (!user) throw new Error('User not authenticated');

        set({ isLoading: true });
        try {
            const id = await imagePromptsService.create(user.uid, prompt);
            const newPrompt = { ...prompt, id };
            set((state) => ({
                imagePrompts: [newPrompt, ...state.imagePrompts],
                isLoading: false
            }));
        } catch (error) {
            console.error('Error adding image prompt:', error);
            set({ isLoading: false });
            throw error;
        }
    },

    updateImagePrompt: async (id, updates) => {
        const { user } = get();
        if (!user) throw new Error('User not authenticated');

        set({ isLoading: true });
        try {
            const updatedData = { ...updates, updatedAt: Date.now() };
            await imagePromptsService.update(user.uid, id, updatedData);
            set((state) => ({
                imagePrompts: state.imagePrompts.map((p) =>
                    p.id === id ? { ...p, ...updatedData } : p
                ),
                isLoading: false
            }));
        } catch (error) {
            console.error('Error updating image prompt:', error);
            set({ isLoading: false });
            throw error;
        }
    },

    deleteImagePrompt: async (id) => {
        const { user } = get();
        if (!user) throw new Error('User not authenticated');

        set({ isLoading: true });
        try {
            await imagePromptsService.delete(user.uid, id);
            set((state) => ({
                imagePrompts: state.imagePrompts.filter((p) => p.id !== id),
                isLoading: false
            }));
        } catch (error) {
            console.error('Error deleting image prompt:', error);
            set({ isLoading: false });
            throw error;
        }
    },

    loadImagePrompts: async (articleId) => {
        const { user } = get();
        if (!user) return;

        // SKIP fetch if we are using injected test data (determinism)
        if (typeof window !== 'undefined' && (window as any).__TEST_DATA__) {
            console.log('[Store] Skipping loadImagePrompts due to injected test data');
            return;
        }

        set({ isLoading: true });
        try {
            const prompts = articleId
                ? await imagePromptsService.getByArticle(user.uid, articleId)
                : await imagePromptsService.getAll(user.uid);
            set({ imagePrompts: prompts, isLoading: false });
        } catch (error) {
            console.error('Error loading image prompts:', error);
            set({ isLoading: false });
        }
    },

    loadTopicQueueSnapshots: async () => {
        const { user } = get();
        if (!user) return;
        try {
            const snapshots = await topicQueueService.getAllSnapshots(user.uid);
            set({ topicQueueSnapshots: snapshots });
        } catch (error) {
            console.error('Error loading topic queue snapshots:', error);
        }
    },

    saveTopicQueueSnapshot: async (queue: string[], name: string = 'backup', genDate?: number) => {
        const { user } = get();
        if (!user) return;
        try {
            set({ isLoading: true });
            await topicQueueService.saveSnapshot(user.uid, queue, name, genDate);
            // Reload snapshots
            const snapshots = await topicQueueService.getAllSnapshots(user.uid);
            set({ topicQueueSnapshots: snapshots, isLoading: false });
        } catch (error) {
            console.error('Error saving topic queue snapshot:', error);
            set({ isLoading: false });
        }
    },

    updateTopicQueueSnapshot: async (id: string, queue: string[], genDate?: number) => {
        const { user } = get();
        if (!user) return;
        try {
            set({ isLoading: true });
            await topicQueueService.updateSnapshot(user.uid, id, queue, genDate);
            set(state => ({
                topicQueueSnapshots: state.topicQueueSnapshots.map(s =>
                    s.id === id ? { ...s, queue, genDate: genDate || s.genDate, status: 'pending' } : s
                ),
                isLoading: false
            }));
        } catch (error) {
            console.error('Error updating topic queue snapshot:', error);
            set({ isLoading: false });
        }
    },

    deleteTopicQueueSnapshot: async (id: string) => {
        const { user } = get();
        if (!user) return;
        try {
            await topicQueueService.deleteSnapshot(user.uid, id);
            set(state => ({
                topicQueueSnapshots: state.topicQueueSnapshots.filter(s => s.id !== id)
            }));
        } catch (error) {
            console.error('Error deleting topic queue snapshot:', error);
        }
    },

    // Real-time Queue Logs
    subscribeToQueueLogs: () => {
        const { user } = get();
        if (!user) return;

        // Clean up existing if any
        const { unsubscribeFromQueueLogs } = get();
        unsubscribeFromQueueLogs();

        const unsubscribe = topicQueueService.subscribeToQueueLogs(user.uid, (logs) => {
            set({ queueLogs: logs });
        });

        (window as any)._unsubscribeQueueLogs = unsubscribe;
    },

    unsubscribeFromQueueLogs: () => {
        if ((window as any)._unsubscribeQueueLogs) {
            (window as any)._unsubscribeQueueLogs();
            (window as any)._unsubscribeQueueLogs = null;
        }
    },

    // Clear all data on logout
    clearData: () => set({
        user: null,
        posts: [],
        media: [],
        settings: defaultSettings,
        articles: [],
        perplexityPrompts: [],
        topicSets: [],
        imagePrompts: [],
        topicQueueSnapshots: [],
        genHistory: [],
        isLoading: false,
        isInitialized: false
    }),

    loadGenHistory: async () => {
        const { user } = get();
        if (!user) return;
        set({ isLoading: true });
        try {
            const genHistory = await genHistoryService.getAll(user.uid);
            set({ genHistory, isLoading: false });
        } catch (error) {
            console.error('Error loading gen history:', error);
            set({ isLoading: false });
        }
    },

    addGenHistory: async (record) => {
        const { user } = get();
        if (!user) throw new Error('User not authenticated');

        set({ isLoading: true });
        try {
            const id = await genHistoryService.create(user.uid, record);
            const newRecord = { ...record, id };
            set((state) => ({
                genHistory: [newRecord, ...state.genHistory],
                isLoading: false
            }));
            return id;
        } catch (error) {
            console.error('Error adding gen history:', error);
            set({ isLoading: false });
            throw error;
        }
    },

    updateGenHistory: async (id, updates) => {
        const { user } = get();
        if (!user) throw new Error('User not authenticated');

        set({ isLoading: true });
        try {
            await genHistoryService.update(user.uid, id, updates);
            set((state) => ({
                genHistory: state.genHistory.map((h) =>
                    h.id === id ? { ...h, ...updates, processDateTime: updates.processDateTime || h.processDateTime } : h
                ),
                isLoading: false
            }));
        } catch (error) {
            console.error('Error updating gen history:', error);
            set({ isLoading: false });
            throw error;
        }
    },

    deleteGenHistory: async (id) => {
        const { user } = get();
        if (!user) throw new Error('User not authenticated');

        set({ isLoading: true });
        try {
            await genHistoryService.delete(user.uid, id);
            set((state) => ({
                genHistory: state.genHistory.filter((h) => h.id !== id),
                isLoading: false
            }));
        } catch (error) {
            console.error('Error deleting gen history:', error);
            set({ isLoading: false });
            throw error;
        }
    },

    clearGenHistory: async () => {
        const { user } = get();
        if (!user) throw new Error('User not authenticated');

        set({ isLoading: true });
        try {
            await genHistoryService.clearAll(user.uid);
            set({ genHistory: [], isLoading: false });
        } catch (error) {
            console.error('Error clearing gen history:', error);
            set({ isLoading: false });
            throw error;
        }
    }
}));

// Expose store for testing
if (typeof window !== 'undefined') {
    (window as any).__STORE__ = useStore;
}
