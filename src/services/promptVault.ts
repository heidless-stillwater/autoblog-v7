import { useStore } from '../store';

export interface PromptVaultVersion {
    id: string;
    promptText: string;
    imageUrl: string; // base64 or URL
    versionNumber: number;
    createdAt: string | number;
}

export interface PromptVaultSet {
    id: string;
    name: string;
    description?: string;
    userId: string;
    createdAt: string | number;
    versions?: PromptVaultVersion[];
}

export interface PromptVaultResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

class PromptVaultService {
    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const { settings } = useStore.getState();
        const apiKey = settings.promptVaultApiKey || import.meta.env.VITE_PROMPTVAULT_API_KEY;
        let baseUrl = settings.promptVaultBaseUrl || import.meta.env.VITE_PROMPTVAULT_BASE_URL;

        // Auto-use proxy for known URLs in dev to avoid CORS
        if (import.meta.env.DEV) {
            if (baseUrl === 'https://imageprompt-v1-dev.web.app/api') {
                baseUrl = '/api/vault';
            } else if (baseUrl === 'http://localhost:3000/api') {
                baseUrl = '/api/vault-local';
            }
        }

        const url = `${baseUrl}${endpoint}`;
        const headers = {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
            ...options.headers,
        };

        const response = await fetch(url, { ...options, headers });

        if (response.status === 401) {
            throw new Error('Unauthorized: Invalid API Key');
        }

        if (response.status === 403) {
            throw new Error('Forbidden: Access denied');
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `API Error: ${response.statusText}`);
        }

        const result: PromptVaultResponse<T> = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'Operation failed');
        }

        return result.data;
    }

    // Retrieval
    async getVersions(): Promise<PromptVaultVersion[]> {
        return this.request<PromptVaultVersion[]>('/versions');
    }

    async getUserVersions(userId: string): Promise<PromptVaultVersion[]> {
        return this.request<PromptVaultVersion[]>(`/versions/user/${userId}`);
    }

    async getPromptSets(): Promise<PromptVaultSet[]> {
        return this.request<PromptVaultSet[]>('/promptSets');
    }

    async getUserPromptSets(userId: string): Promise<PromptVaultSet[]> {
        return this.request<PromptVaultSet[]>(`/promptSets/user/${userId}`);
    }

    async getSpecificVersion(setId: string, versionId: string): Promise<PromptVaultVersion> {
        return this.request<PromptVaultVersion>(`/promptSets/${setId}/versions/${versionId}`);
    }

    // Management
    async createPromptSet(data: Partial<PromptVaultSet>): Promise<PromptVaultSet> {
        return this.request<PromptVaultSet>('/promptSets', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updatePromptSet(setId: string, data: Partial<PromptVaultSet>): Promise<PromptVaultSet> {
        return this.request<PromptVaultSet>(`/promptSets/${setId}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async addVersion(setId: string, data: Partial<PromptVaultVersion>): Promise<PromptVaultVersion> {
        return this.request<PromptVaultVersion>(`/promptSets/${setId}/versions`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async deletePromptSet(setId: string): Promise<void> {
        return this.request<void>(`/promptSets/${setId}`, {
            method: 'DELETE',
        });
    }
}

export const promptVaultService = new PromptVaultService();
