import { describe, it, expect, vi, beforeEach } from 'vitest';
import { promptVaultService } from './promptVault';

global.fetch = vi.fn();

describe('PromptVaultService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should fetch versions successfully', async () => {
        const mockData = { success: true, data: [{ id: '1', promptText: 'test' }] };
        (fetch as any).mockResolvedValue({
            ok: true,
            json: async () => mockData,
        });

        const versions = await promptVaultService.getVersions();
        expect(versions).toEqual(mockData.data);
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/versions'), expect.any(Object));
    });

    it('should handle 401 Unauthorized', async () => {
        (fetch as any).mockResolvedValue({
            ok: false,
            status: 401,
            statusText: 'Unauthorized',
        });

        await expect(promptVaultService.getVersions()).rejects.toThrow('Unauthorized: Invalid API Key');
    });

    it('should handle API errors', async () => {
        const mockError = { success: false, message: 'Invalid request' };
        (fetch as any).mockResolvedValue({
            ok: false,
            status: 400,
            json: async () => mockError,
        });

        await expect(promptVaultService.getVersions()).rejects.toThrow('Invalid request');
    });
});
