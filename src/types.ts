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

export interface StyleOptions {
    composition: string;
    medium: string;
    lighting: string;
    mood: string;
}

export interface PromptPreset {
    id: string;
    name: string;
    styleOptions: StyleOptions;
    customInstructions: string;
    modelGuidelines: string;
    createdAt: number;
}

export interface ImageStylePreset {
    id: string;
    name: string;
    customInstructions: string;
    modelGuidelines: string;
    createdAt: number;
}

export interface Settings {
    siteTitle: string;
    tagline: string;
    perplexityApiKey: string;
    geminiApiKey: string;
    braveApiKey?: string;
    claudeApiKey?: string;
    sudowriteApiKey?: string;
    novelcrafterApiKey?: string;
    characterAiApiKey?: string;
    chatgptApiKey?: string;
    iaskAiApiKey?: string;
    perplexityModel: 'sonar' | 'sonar-reasoning' | 'sonar-deep-research';
    theme: 'light' | 'dark' | 'system';
    customSeeds?: string[];
    topicQueue?: string[];
    queueProcessInterval?: number; // In minutes
    imageStylePresets?: ImageStylePreset[];
    promptPresets?: PromptPreset[];
}

export type ToolCategory = 'debater' | 'muse' | 'analyst';
export type ResearchTool =
    | 'perplexity' | 'brave-goggles' | 'claude-4-5'
    | 'sudowrite' | 'novelcrafter' | 'character-ai'
    | 'gemini-deep' | 'chatgpt-o1' | 'iask-ai';

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
    isHero?: boolean;
    version?: number;
    previousVersionId?: string;
    heroReasoning?: string; // Analysis of why this visual represents the article theme
    presetId?: string; // ID of the preset applied to this prompt
}

export interface User {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    favorites?: string[];
}

export type PublicPost = Post | Article;

export interface AuthState {
    user: User | null;
    loading: boolean;
    error: string | null;
}

export interface TopicQueueSnapshot {
    id: string; // topicQueue-{id}-{timestamp}
    queue: string[];
    createdAt: number;
    genDate: number; // For scheduling or other purposes
    status?: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface GenHistory {
    id: string;
    topicSetName: string;
    topicName: string;
    topicState: 'pending' | 'processing' | 'completed' | 'error';
    processDateTime: number;
    topicArticleURL: string; // "pending" or Article link
}
