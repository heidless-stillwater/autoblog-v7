export interface Post {
    id: string;
    title: string;
    content: string; // Markdown
    status: 'draft' | 'live';
    createdAt: number;
    updatedAt: number;
    heroImage?: string; // URL or Base64
    excerpt?: string;
    tags: string[];
    attachments: string[];
}

export interface MediaItem {
    id: string;
    name: string;
    type: string;
    url: string; // Base64 or Blob URL
    createdAt: number;
    size: number;
}

export interface Settings {
    siteTitle: string;
    tagline: string;
    perplexityApiKey: string;
    geminiApiKey: string;
    perplexityModel: 'sonar' | 'sonar-reasoning' | 'sonar-deep-research';
    theme: 'light' | 'dark' | 'system';
    customSeeds?: string[];
}

export interface PerplexityPrompt {
    id: string;
    prompt: string;
    response: string;
    revisionId: number;
    createdAt: number;
    topic: string;
}

export interface ArticleVersion {
    id: string;
    content: string; // Markdown content
    title: string;
    createdAt: number;
    generatedBy: 'ai' | 'user';
    researchId?: string; // Link to PerplexityPrompt
}

export interface TopicSet {
    id: string; // UUID
    seed: string; // The seed prompt used
    topics: string[]; // List of generated topics
    createdAt: number;
    generatedBy?: 'ai' | 'user';
}

export interface Article {
    id: string;
    topic: string;
    status: 'draft' | 'scheduled' | 'published';
    scheduleDate?: number; // Timestamp
    scheduleTime?: string; // HH:MM format
    currentVersionId: string;
    versions: ArticleVersion[];
    createdAt: number;
    updatedAt: number;
    heroImage?: string; // Generated image URL
}

export interface ImagePrompt {
    id: string;
    articleId: string;
    topic: string; // Added to identify by topic in question
    sectionTitle: string;
    prompt: string;
    createdAt: number;
    updatedAt: number;
    isPromptInserted?: boolean;
    isImageInserted?: boolean;
}

export interface User {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
}

export interface AuthState {
    user: User | null;
    loading: boolean;
    error: string | null;
}
