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

const PERPLEXITY_API_URL = import.meta.env.DEV ? '/api/perplexity' : 'https://api.perplexity.ai';
const GEMINI_API_URL = import.meta.env.DEV ? '/api/gemini' : 'https://generativelanguage.googleapis.com';

export const BLOG_STYLE_GUIDE = `# 🎤 Blog Tone & Style Guide: “Entertain While You Educate”

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

### 🛠 Technical Markdown Formatting (CRITICAL)
- **Headers**: ALWAYS use standard Markdown hash syntax (e.g., \`# Title\`, \`## Subtitle\`). NEVER use text labels like "H1" or "H2".
- **Tables**: ALWAYS use standard GFM table format. Ensure there is a blank line immediately before and after every table.
- **Table Structure**: Each table must have a header row and a separator row (e.g., | --- | --- |). Do not include leading spaces before the pipe character.
- **Spacing**: Add a newline after every paragraph. Do not include intros or outros. Output only the Markdown content (no conversational filler).`;

export const ARTICLE_GUIDELINES = `
    ## 🧠 Writing Guidelines
    Each blog article must:
    - Begin with a **compelling introduction** that clearly explains the importance of the topic and hooks the reader in the first few lines.
    - Maintain a **conversational, professional, and easy-to-follow tone** — avoid jargon and overly academic language.
    - Include **real-world examples, case studies, statistics, or quotes**, with accurate source attribution.
    - Be organized with:
      - **Descriptive H2 and H3 headers** (Use standard Markdown \`#\`, \`##\`, \`###\`)
      - **Short paragraphs and skimmable formatting**
      - **Bullet points or numbered lists** where appropriate
    - Use **sparingly placed emojis (1–3 max)** only if relevant to tone or clarity.
    - Conclude with a **strong closing section** that:
      - Recaps key takeaways
      - Provides suggested next steps or further reading

    ## ⚙️ Output Rules
    - Output only the final blog article formatted in **Markdown** — do not include planning notes, commentary, intros, or explanations.
    - Write the full article in **Markdown format**, with clear section headers (\`##\`, \`###\`, etc.).
    - **Tabular Data**: Use clean, standard Markdown tables for any tabular information.
    - **Spacing**: Add a newline after every paragraph.
`;

/**
 * Strips markdown code block wrappers if they exist (e.g. ```markdown ... ```)
 * This ensures ReactMarkdown renders the content itself rather than a code block.
 */
const cleanMarkdown = (content: string): string => {
    // 1. Robust markdown block match (ignores case, handles optional whitespace around content)
    // Matches ```markdown [content] ```
    const markdownMatch = content.match(/```markdown\s*([\s\S]*?)\s*```/i);
    if (markdownMatch) {
        // Return ONLY the captured content inside the block
        return markdownMatch[1].trim();
    }

    // 2. Generic blocks: Try to find content inside generic code blocks ``` ... ```
    const trimmed = content.trim();
    if (trimmed.startsWith('```') && trimmed.endsWith('```')) {
        // Remove first line (closing fence) and last line (opening fence logic is complex, simplify)
        // match ```[lang] \n [content] \n ```
        const genericMatch = trimmed.match(/^```[a-z]*\s+([\s\S]*?)\s+```$/i);
        if (genericMatch) return genericMatch[1].trim();

        // Fallback for simple fence stripping if regex fails
        const lines = trimmed.split('\n');
        if (lines.length >= 2) {
            return lines.slice(1, -1).join('\n').trim();
        }
    }

    // 3. Fallback: just return the trimmed original
    let cleaned = content.trim();

    // 4. Ensure tables have newlines before them and no leading spaces for GFM parsing
    cleaned = cleaned.replace(/([^\n])\n\|/g, '$1\n\n|');
    cleaned = cleaned.replace(/^\s+\|/gm, '|');

    return cleaned;
};

export const generatePostContent = async (topic: string, settings: Settings): Promise<AIResponse> => {
    if (!settings.perplexityApiKey) {
        return { content: '', error: 'Perplexity API Key is missing. Please add it in Settings.' };
    }

    try {
        const response = await fetch(`${PERPLEXITY_API_URL}/chat/completions`, {
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
                max_tokens: 4000, // Increased for longer articles
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
    - Ensure the article is **a minimum of 2,000 words** to provide depth and SEO value.

    Writing Guidelines & Output Rules:
    ${ARTICLE_GUIDELINES}
    
    Workflow Summary:
    1. Accept the user’s topic (e.g., “The ROI of warehouse automation”)
    2. Conduct a Perplexity-powered search to gather timely insights, examples, and supporting data
    3. Write a complete blog article using the structure and tone above
    4. Output only the final **Markdown** article (no additional comments or context)
    `;

    try {
        const response = await fetch(`${PERPLEXITY_API_URL}/chat/completions`, {
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

            const researchResult = await fetch(`${PERPLEXITY_API_URL}/chat/completions`, {
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
    - Ensure the article is **a minimum of 2,000 words** to provide depth and SEO value.

    Writing Guidelines & Output Rules:
    ${ARTICLE_GUIDELINES}
    `;

        const articleResult = await fetch(`${PERPLEXITY_API_URL}/chat/completions`, {
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
        const response = await fetch(`${GEMINI_API_URL}/v1beta/models/gemini-2.0-flash:generateContent?key=${settings.geminiApiKey}`, {
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
    Task: Rewrite the following blog article content to strictly adhere to the Blog Tone & Style Guide provided below, while ENHANCING the structure and formatting.
    
    Style Guide:
    ${BLOG_STYLE_GUIDE}
    
    Writing & Formatting Rules:
    ${ARTICLE_GUIDELINES}
    
    original Content:
    ${content}
    
    Instructions:
    - REWRITE the content to match the "Voice & Personality" from the Style Guide.
    - RESTRUCTURE the content to match the "Writing Guidelines" above (add H3s, lists, emojis if missing).
    - Ensure all Output Rules are met (valid Markdown, no intro/outro).
    - **CRITICAL**: Do NOT remove Markdown headers (#, ##, etc.). ENHANCE them.
    `;

    try {
        const response = await fetch(`${PERPLEXITY_API_URL}/chat/completions`, {
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
                max_tokens: 4096,
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
 * Generates SEO keywords for a given content using Gemini
 */
export const generateSEOKeywords = async (content: string, settings: Settings): Promise<{ keywords: string[]; error?: string }> => {
    if (!settings.geminiApiKey) {
        return { keywords: [], error: 'Gemini API Key is missing. Please add it in Settings.' };
    }

    try {
        const response = await fetch(`${GEMINI_API_URL}/v1beta/models/gemini-2.0-flash:generateContent?key=${settings.geminiApiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `You are an SEO expert. Analyze the following blog content and generate exactly 10 highly relevant SEO keywords or short phrases. Output ONLY a clean JSON array of strings. Content: ${content.substring(0, 5000)}`
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 500,
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return { keywords: [], error: errorData.error?.message || `Gemini API Error: ${response.statusText}` };
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleanedText = text.replace(/```json|```/g, '').trim();

        // Extract JSON array
        const start = cleanedText.indexOf('[');
        const end = cleanedText.lastIndexOf(']');
        if (start !== -1 && end !== -1) {
            const jsonStr = cleanedText.substring(start, end + 1);
            const keywords = JSON.parse(jsonStr);
            if (Array.isArray(keywords)) {
                return { keywords };
            }
        }
        return { keywords: [], error: 'Invalid response format from Gemini' };
    } catch (error) {
        return { keywords: [], error: error instanceof Error ? error.message : 'Unknown error' };
    }
};

/**
 * Optimizes content for SEO based on keywords and style
 */
export const optimizeForSEO = async (content: string, keywords: string, style: string, settings: Settings): Promise<AIResponse> => {
    if (!settings.perplexityApiKey) {
        return { content: '', error: 'Perplexity API Key is missing. Please add it in Settings.' };
    }

    // Safety Check: Very long articles (approx > 10,000 chars) might hit output limits
    if (content.length > 15000) {
        console.warn("Large content detected. SEO optimization might be truncated due to AI token limits.");
    }

    const prompt = `You are an expert SEO copywriter. Your task is to rewrite the input text to match a specified **writing style** while optimizing it for the given **SEO keywords**.

Your output should:
- Retain the original meaning and intent.  
- Follow the requested writing style (e.g., formal, casual, persuasive, punchy, friendly), changing the least amount possible
- Naturally and effectively include the provided SEO keywords, without stuffing.  
- Use proper grammar and smooth transitions.  
- Be engaging and easy to read.  

Return only the improved version of the text.  


## ✅ Output Behavior

- Rewritten in the defined style  
- Keywords naturally embedded  
- Clear, engaging copy

Target Writing Style: ${style}
Target SEO Keywords: ${keywords}

Original Content:
${content}
`;

    try {
        const response = await fetch(`${PERPLEXITY_API_URL}/chat/completions`, {
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
                        content: 'You are an expert SEO copywriter and editor.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 4096,
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
 * Interface for the structured image prompt response
 */
export interface ImagePromptDraft {
    sectionTitle: string;
    prompt: string;
}

/**
 * Generates image prompts for major blog sections using Gemini
 */
export const generateImagePrompts = async (content: string, settings: Settings): Promise<{ prompts: ImagePromptDraft[], error?: string }> => {
    if (!settings.geminiApiKey) {
        return { prompts: [], error: 'Gemini API Key is missing. Please add it in Settings.' };
    }

    const promptText = `Analyze the following blog post and identify EXACTLY 8 major sections (including introduction, conclusion, and key subsections). 
For each identified section, create a highly detailed, photorealistic image generation prompt for NanoBanana.

Rules:
1. The VERY FIRST prompt must be a sophisticated, high-impact prompt for the **HERO IMAGE**. It should not be tied to a specific section but should instead encapsulate the **gestalt** (the overall mood, theme, and essence) of the entire article. Use "Hero Image" as the sectionTitle for this first entry.
2. For the subsequent 7 entries, use the EXACT text of the section's header from the markdown as the "sectionTitle". If a section doesn't have a clear header, identify the most representative visual break.
3. Limit to exactly 8 prompts total.
4. Each prompt should be a vivid description of a scene or concept, suitable for high-quality AI image generation.
5. Output ONLY a clean JSON array of objects with keys: "sectionTitle" and "prompt".

Blog Post Content:
${content}
`;

    try {
        const response = await fetch(`${GEMINI_API_URL}/v1beta/models/gemini-2.0-flash:generateContent?key=${settings.geminiApiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: promptText
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048,
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return { prompts: [], error: errorData.error?.message || `Gemini API Error: ${response.statusText}` };
        }

        const data = await response.json();
        let contentStr = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Clean markdown code blocks
        if (contentStr.includes('```json')) {
            contentStr = contentStr.split('```json')[1].split('```')[0].trim();
        } else if (contentStr.includes('```')) {
            contentStr = contentStr.split('```')[1].split('```')[0].trim();
        }

        try {
            const parsed = JSON.parse(contentStr);
            const prompts = Array.isArray(parsed) ? parsed : (parsed.prompts || []);
            return { prompts: prompts.slice(0, 8) };
        } catch (parseError) {
            console.error('Failed to parse Gemini response as JSON:', contentStr);
            return { prompts: [], error: 'Failed to parse AI response. The model may have returned malformed data.' };
        }
    } catch (error) {
        return { prompts: [], error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
};

/**
 * Generates an image using NanoBanana (Gemini)
 */
export const generateImage = async (prompt: string, settings: Settings): Promise<{ imageUrl?: string, error?: string }> => {
    if (!settings.geminiApiKey) {
        return { error: 'Gemini API Key is missing. Please add it in Settings.' };
    }

    const models = [
        'gemini-3-pro-image-preview',
        'imagen-3.0-generate-001',
        'gemini-2.0-flash-exp'
    ];

    let lastError = '';

    for (const model of models) {
        try {
            const response = await fetch(`${GEMINI_API_URL}/v1beta/models/${model}:generateContent?key=${settings.geminiApiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }]
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const msg = errorData.error?.message || `API Error: ${response.statusText}`;
                console.error(`NanoBanana attempt with ${model} failed:`, msg);
                lastError = msg;
                continue; // Try next model
            }

            const data = await response.json();
            const base64Data = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)?.inlineData?.data;

            if (base64Data) {
                return { imageUrl: `data:image/png;base64,${base64Data}` };
            }

            lastError = 'No image data returned from API for ' + model;
        } catch (error) {
            lastError = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error(`NanoBanana attempt with ${model} errored:`, lastError);
        }
    }

    return { error: `All NanoBanana models failed. Last error: ${lastError}` };
};
