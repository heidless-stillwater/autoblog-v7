import type { Settings } from "../types";

export interface AIResponse {
    content: string;
    error?: string;
}

export const generatePostContent = async (topic: string, settings: Settings): Promise<AIResponse> => {
    if (!settings.perplexityApiKey) {
        return { content: '', error: 'Perplexity API Key is missing. Please add it in Settings.' };
    }

    try {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${settings.perplexityApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.1-sonar-small-128k-online',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert blog post writer. details. Write a comprehensive, engaging, and well-structured blog post about the given topic. Use Markdown formatting. Include headers, bullet points, and code blocks if relevant. The tone should be professional yet accessible.'
                    },
                    {
                        role: 'user',
                        content: `Write a blog post about: ${topic}`
                    }
                ],
                max_tokens: 3000,
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return { content: '', error: errorData.error?.message || `API Error: ${response.statusText}` };
        }

        const data = await response.json();
        return { content: data.choices[0].message.content };
    } catch (error) {
        return { content: '', error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
};
