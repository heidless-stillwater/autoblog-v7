import type { Settings } from "../types";

export interface AIResponse {
    content: string;
    error?: string;
}

export interface ResearchResponse {
    content: string;
    error?: string;
    researchPrompt?: string;
    researchResponse?: string;
}

export const BLOG_STYLE_GUIDE = `=# 🎤 Blog Tone & Style Guide: “Entertain While You Educate”

## 🎭 Voice & Personality
You are a **witty, self-aware writer** who combines dad jokes, pop culture references, and playful sarcasm with surprisingly clear and insightful content. Think: cheeky uncle meets thoughtful mentor. You’re the fun teacher who makes even boring topics (yes, even accounting) feel like a stand-up set — with homework.

## 🧑‍🏫 Writing Style Guidelines
- **Start strong** with a humorous hook, quirky anecdote, or painfully good pun. First impressions count — make ‘em laugh or raise an eyebrow.
- Make **self-deprecating remarks** or poke fun at the topic (“I know, plumbing isn’t exactly Netflix material, but stick with me…”).
- Pepper in **references to hypothetical kids, confused readers, or your own inner monologue** (“My 7-year-old asked if I was done talking about tax deductions. I said ‘never.’”).
- Keep the tone **conversational and casual**, using phrases like:
  - “Let’s be real…”
  - “You feel me?”
  - “*cue dramatic pause*”
  - “Hot take coming in 3…2…1”
- Use **rhetorical questions** and break the fourth wall often to engage the reader directly (“Still reading? Wow. You’re officially my favorite.”).
- **Switch gears** gracefully into serious educational content when needed — but always with a wink, smirk, or a side of sass.
- **End each section with a clever or warm takeaway** — like a funny professor wrapping up class with “and yes, this *will* be on the test.”

## 🔁 Tone Shift Examples
- When talking numbers:  
  “Now, before your eyes glaze over like a Krispy Kreme, let’s break down this balance sheet…”
- When dropping facts:  
  “Here’s the boring part. Just kidding — it’s actually kinda cool. Or maybe I’ve been doing this too long.”

## ✨ Your Mission
To **entertain while educating** — and maybe, just maybe, help someone laugh *and* learn something. If readers feel like they’re being taught by a quirky, lovable uncle who moonlights as a life coach? Nailed it. 

### 🛠 Formatting Rules
- **Markdown Tables**: Always use standard Markdown table format for tabular data (e.g., | Header | Header |).
- **Table Spacing**: ALWAYS add a blank line BEFORE and AFTER every Markdown table.
- **Contiguous Tables**: Ensure no extra empty lines between table rows or between the header/separator and the data.
- **Spacing**: Add a newline after every paragraph, BUT do not add newlines between rows of a table or list.
- **No Intros/Outros**: Output ONLY the final content.`;

/**
 * Strips markdown code block wrappers if they exist (e.g. ```markdown ... ```)
 * This ensures ReactMarkdown renders the content itself rather than a code block.
 */
const cleanMarkdown = (content: string): string => {
    // 1. Remove markdown code block wrappers if they wrap the entire content
    // Check for ```markdown ... ```
    const markdownMatch = content.match(/^[\s\n]*```markdown\n([\s\S]*?)\n```[\s\n]*$/i);
    if (markdownMatch) return markdownMatch[1].trim();

    // Check for generic ``` ... ```
    const genericMatch = content.match(/^[\s\n]*```\n?([\s\S]*?)\n```[\s\n]*$/);
    if (genericMatch) return genericMatch[1].trim();

    // 2. If it's not wrapped, just trim it
    let cleaned = content.trim();

    // 3. Ensure tables have newlines before them if they are preceded by text
    // This is a common issue with GFM parsing
    cleaned = cleaned.replace(/([^\n])\n\|/g, '$1\n\n|');

    return cleaned;
};

export const generatePostContent = async (topic: string, settings: Settings): Promise<AIResponse> => {
    if (!settings.perplexityApiKey) {
        return { content: '', error: 'Perplexity API Key is missing. Please add it in Settings.' };
    }

    try {
        const response = await fetch('/api/perplexity/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${settings.perplexityApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: settings.perplexityModel || 'sonar',
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert blog post writer. Write a comprehensive, engaging, and well-structured blog post about the given topic. Use Markdown formatting. Include headers, bullet points, and code blocks if relevant. The tone should be professional yet accessible. 
                        
                        Adhere to this Style Guide:
                        ${BLOG_STYLE_GUIDE}`
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
        return { content: cleanMarkdown(data.choices[0].message.content) };
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
    You are a professional blog writer AI. Your job is to write **engaging, well-structured, and research-backed blog articles** that are designed to hold attention and provide real value.

    Primary Objectives:
    For every blog post you create:
    - **Start by conducting a real-time research session using the topic: "${topic}"** to gather the most recent, accurate, and relevant insights, data, and examples.
    - Tailor the content to the **knowledge level, interests, and needs of the target audience**.
    - Ensure the article is **a minimum of 1,000 words** to provide depth and SEO value.

    Writing Guidelines:
    Each blog article must:
    - Begin with a **compelling introduction** that clearly explains the importance of the topic and hooks the reader in the first few lines.
    - Maintain a **conversational, professional, and easy-to-follow tone** — avoid jargon and overly academic language.
    - Include **real-world examples, case studies, statistics, or quotes**, with accurate source attribution (e.g., “according to [source]”).
    - Be organized with:
      - **Descriptive H2 and H3 headers**
      - **Short paragraphs and skimmable formatting**
      - **Bullet points or numbered lists** where appropriate
    - Use **sparingly placed emojis (1–3 max)** only if relevant to tone or clarity.
    - Conclude with a **strong closing section** that:
      - Recaps key takeaways
      - Provides suggested next steps or further reading
      - Optionally includes links to tools, guides, or calls-to-action

    Output Rules:
    - Output only the **final blog article text** — do not include planning notes, commentary, or explanations.
    - Write the full article in **Markdown format**, with clear section headers (##, ###, etc.).
    - Ensure the blog post is **at least 1,000 words** long.
    - **Tabular Data**: Use clean, standard Markdown tables for any tabular information.
    - **Spacing**: Add a newline after every paragraph (except between rows of a table or list).
    
    Workflow Summary:
    1. Accept the user’s topic (e.g., “The ROI of warehouse automation”)
    2. Conduct a Perplexity-powered search to gather timely insights, examples, and supporting data
    3. Write a complete blog article using the structure and tone above
    4. Output only the final article (no additional comments or context)
    `;

    try {
        const response = await fetch('/api/perplexity/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${settings.perplexityApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: settings.perplexityModel || 'sonar',
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert professional blog writer. Adhere to this Style Guide:
${BLOG_STYLE_GUIDE}`
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
        return { content: cleanMarkdown(data.choices[0].message.content) };
    } catch (error) {
        return { content: '', error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
};

/**
 * Generate article with research caching support
 * @param topic - The topic to research and write about
 * @param settings - User settings including API key
 * @param cachedResearch - Optional cached research to use instead of generating new
 * @returns Article content and research data
 */
export const generateWithResearch = async (
    topic: string,
    settings: Settings,
    cachedResearch?: { prompt: string; response: string }
): Promise<ResearchResponse> => {
    if (!settings.perplexityApiKey) {
        return { content: '', error: 'Perplexity API Key is missing. Please add it in Settings.' };
    }

    try {
        let researchPrompt = '';
        let researchResponse = '';

        // Step 1: Get research (either cached or new)
        if (cachedResearch) {
            researchPrompt = cachedResearch.prompt;
            researchResponse = cachedResearch.response;
        } else {
            // Generate new research
            researchPrompt = `Conduct comprehensive research on the topic: "${topic}". Gather recent insights, statistics, examples, case studies, and expert opinions. Focus on factual, up-to-date information that would be valuable for a blog article.`;

            const researchResult = await fetch('/api/perplexity/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${settings.perplexityApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'sonar',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a research assistant. Provide comprehensive, factual research on the given topic.'
                        },
                        {
                            role: 'user',
                            content: researchPrompt
                        }
                    ],
                    max_tokens: 2000,
                })
            });

            if (!researchResult.ok) {
                const errorData = await researchResult.json().catch(() => ({}));
                return { content: '', error: errorData.error?.message || `Research API Error: ${researchResult.statusText}` };
            }

            const researchData = await researchResult.json();
            researchResponse = researchData.choices[0].message.content;
        }

        // Step 2: Generate article using research
        const articlePrompt = `
    Role & Purpose:
    You are a professional blog writer AI. Your job is to write **engaging, well-structured, and research-backed blog articles** that are designed to hold attention and provide real value.

    Research Data:
    ${researchResponse}

    Primary Objectives:
    For every blog post you create:
    - Use the provided "Research Data" above to write the article about: "${topic}".
    - Tailor the content to the **knowledge level, interests, and needs of the target audience**.
    - Ensure the article is **a minimum of 1,000 words** to provide depth and SEO value.

    Writing Guidelines:
    Each blog article must:
    - Begin with a **compelling introduction** that clearly explains the importance of the topic and hooks the reader in the first few lines.
    - Maintain a **conversational, professional, and easy-to-follow tone** — avoid jargon and overly academic language.
    - Include **real-world examples, case studies, statistics, or quotes**, with accurate source attribution (e.g., “according to [source]”).
    - Be organized with:
      - **Descriptive H2 and H3 headers**
      - **Short paragraphs and skimmable formatting**
      - **Bullet points or numbered lists** where appropriate
    - Use **sparingly placed emojis (1–3 max)** only if relevant to tone or clarity.
    - Conclude with a **strong closing section** that:
      - Recaps key takeaways
      - Provides suggested next steps or further reading
      - Optionally includes links to tools, guides, or calls-to-action

    Output Rules:
    - Output only the **final blog article text** — do not include planning notes, commentary, or explanations.
    - Write the full article in **Markdown format**, with clear section headers (##, ###, etc.).
    - Ensure the blog post is **at least 1,000 words** long.
    - **Tabular Data**: Use clean, standard Markdown tables for any tabular information.
    - **Spacing**: Add a newline after every paragraph (except between rows of a table or list).
    `;

        const articleResult = await fetch('/api/perplexity/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${settings.perplexityApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: settings.perplexityModel || 'sonar',
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert professional blog writer. Adhere to this Style Guide:
${BLOG_STYLE_GUIDE}`
                    },
                    {
                        role: 'user',
                        content: articlePrompt
                    }
                ],
                max_tokens: 4000,
            })
        });

        if (!articleResult.ok) {
            const errorData = await articleResult.json().catch(() => ({}));
            return { content: '', error: errorData.error?.message || `Article API Error: ${articleResult.statusText}` };
        }

        const articleData = await articleResult.json();
        return {
            content: cleanMarkdown(articleData.choices[0].message.content),
            researchPrompt,
            researchResponse,
        };
    } catch (error) {
        return { content: '', error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
};

export const generateTopics = async (seed: string, settings: Settings): Promise<{ topics: string[]; error?: string }> => {
    if (!settings.geminiApiKey) {
        return { topics: [], error: 'Gemini API Key is missing. Please add it in Settings.' };
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${settings.geminiApiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `You are a creative blog topic generator. Generate exactly 5 unique, engaging blog post ideas based on the seed: "${seed}". Output ONLY a clean JSON array of strings, like ["Topic 1", "Topic 2"]. No other text, no markdown code blocks.`
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1000,
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return { topics: [], error: errorData.error?.message || `Gemini API Error: ${response.statusText}` };
        }

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleanedContent = content.replace(/```json|```/g, '').trim();

        // Try to parse JSON
        try {
            // Find JSON array if response contains extra text
            const firstBracket = cleanedContent.indexOf('[');
            const lastBracket = cleanedContent.lastIndexOf(']');
            if (firstBracket !== -1 && lastBracket !== -1) {
                const jsonStr = cleanedContent.substring(firstBracket, lastBracket + 1);
                const topics = JSON.parse(jsonStr);
                if (Array.isArray(topics)) {
                    return { topics: topics.slice(0, 5) };
                }
            }
            throw new Error('Invalid JSON format');
        } catch (e) {
            console.error('Failed to parse topic JSON:', cleanedContent);
            // Fallback: split by newlines if JSON parsing fails
            const lines = cleanedContent.split('\n').filter((line: string) => line.trim().length > 0);
            return { topics: lines.slice(0, 5).map((l: string) => l.replace(/^\d+\.\s*|- \s*/, '').trim()) };
        }
    } catch (error) {
        return { topics: [], error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
};

/**
 * Rewrites existing content to match the Blog Style Guide
 */
export const rewriteToStyle = async (content: string, settings: Settings): Promise<AIResponse> => {
    if (!settings.perplexityApiKey) {
        return { content: '', error: 'Perplexity API Key is missing. Please add it in Settings.' };
    }

    const prompt = `
    Task: Rewrite the following blog article content to strictly adhere to the Blog Tone & Style Guide provided below.
    
    Style Guide:
    ${BLOG_STYLE_GUIDE}
    
    Original Content:
    ${content}
    
    Requirements:
    - Maintain the original facts, structure, and headers.
    - Transform the tone to be witty, conversational, and self-aware as per the guide.
    - Include the dad jokes, pop culture references, and self-deprecating remarks requested.
    - Ensure the educational value is preserved but delivered with the specific personality described.
    - Output only the final rewritten markdown. No intros or outros.
    - **Tabular Data**: Ensure all tabular info is converted to or maintained as clean Markdown tables.
    - **Spacing**: Add a newline after every paragraph (except between rows of a table or list).
    `;

    try {
        const response = await fetch('/api/perplexity/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${settings.perplexityApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: settings.perplexityModel || 'sonar',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a master of the "Entertain While You Educate" blog style.'
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
        return { content: cleanMarkdown(data.choices[0].message.content) };
    } catch (error) {
        return { content: '', error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
};
