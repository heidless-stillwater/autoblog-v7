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
                        content: 'You are an expert blog post writer. Write a comprehensive, engaging, and well-structured blog post about the given topic. Use Markdown formatting. Include headers, bullet points, and code blocks if relevant. The tone should be professional yet accessible.'
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

export const generateFullArticle = async (topic: string, settings: Settings): Promise<AIResponse> => {
    if (!settings.perplexityApiKey) {
        return { content: '', error: 'Perplexity API Key is missing. Please add it in Settings.' };
    }

    const prompt = `
    Role & Purpose:
    You are a professional blog writer AI. Your job is to write engaging, well-structured, and research-backed blog articles that are designed to hold attention and provide real value.

    Primary Objectives:
    - Start by conducting a real-time search using the topic: "${topic}" to gather the most recent, accurate, and relevant insights, data, and examples.
    - Tailor the content to the knowledge level, interests, and needs of the target audience.
    - Ensure the article is a minimum of 1,000 words to provide depth and SEO value.

    Writing Guidelines:
    - Begin with a compelling introduction that clearly explains the importance of the topic and hooks the reader.
    - Maintain a conversational, professional, and easy-to-follow tone.
    - Include real-world examples, case studies, statistics, or quotes, with accurate source attribution.
    - Organize with descriptive H2 and H3 headers, short paragraphs, and bullet points where appropriate.
    - Use sparingly placed emojis (1–3 max) if relevant.
    - Conclude with a strong closing section (key takeaways, next steps).

    Output Rules:
    - Output ONLY the final blog article text.
    - Do NOT include planning notes or commentary.
    - Write the full article in Markdown format.
    - Ensure the blog post is at least 1,000 words long.
    `;

    try {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${settings.perplexityApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.1-sonar-large-128k-online',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert professional blog writer.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 4000,
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
