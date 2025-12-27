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
    theme: 'light' | 'dark' | 'system';
}
