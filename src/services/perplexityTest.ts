import type { Settings } from "../types";

export interface ConnectionTestResult {
    success: boolean;
    error?: string;
    tokensUsed?: number;
    responseTime?: number;
}

/**
 * Test Perplexity API connection with minimal token usage
 * Uses the smallest model and minimal prompt to verify connectivity
 */
export const testPerplexityConnection = async (settings: Settings): Promise<ConnectionTestResult> => {
    if (!settings.perplexityApiKey) {
        return {
            success: false,
            error: 'Perplexity API Key is missing. Please add it in Settings.'
        };
    }

    const startTime = Date.now();

    try {
        const response = await fetch('/api/perplexity/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${settings.perplexityApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                // Use smallest model for minimal cost
                model: 'sonar',
                messages: [
                    {
                        role: 'user',
                        // Minimal prompt - just 2 words
                        content: 'Say "OK"'
                    }
                ],
                // Minimal token limit
                max_tokens: 10,
                // Disable search to save tokens
                temperature: 0,
            })
        });

        const responseTime = Date.now() - startTime;

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                success: false,
                error: errorData.error?.message || `API Error: ${response.statusText}`,
                responseTime
            };
        }

        const data = await response.json();

        // Extract token usage from response
        const tokensUsed = data.usage?.total_tokens || 0;

        return {
            success: true,
            tokensUsed,
            responseTime
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            responseTime: Date.now() - startTime
        };
    }
};

/**
 * Get estimated cost for a research query
 * Based on Perplexity pricing (approximate)
 */
export const estimateResearchCost = (topic: string): { estimatedTokens: number; estimatedCost: string } => {
    // Rough estimates:
    // - Research prompt: ~100 tokens
    // - Research response: ~1500-2000 tokens
    // - Article generation prompt (with research): ~2000 tokens
    // - Article response: ~2500-3000 tokens
    // Total: ~6000-7000 tokens per full article generation

    const topicLength = topic.split(' ').length;
    const baseTokens = 6000;
    const topicTokens = topicLength * 50; // Rough estimate
    const estimatedTokens = baseTokens + topicTokens;

    // Perplexity pricing (approximate - check current rates):
    // sonar: ~$0.20 per 1M tokens (input) + $$0.20 per 1M tokens (output)
    // sonar-pro: ~$3 per 1M tokens (input) + $15 per 1M tokens (output)
    const costPer1MTokens = 1.0; // Average estimate
    const estimatedCost = ((estimatedTokens / 1000000) * costPer1MTokens).toFixed(4);

    return {
        estimatedTokens,
        estimatedCost: `$${estimatedCost}`
    };
};
