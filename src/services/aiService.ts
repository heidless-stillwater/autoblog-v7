import type { Settings, ResearchTool } from "../types";

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

const PERPLEXITY_API_URL = '/api/perplexity';
const GEMINI_API_URL = '/api/gemini';

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
    - Ensure the article is **a minimum of ${settings.articleDefaultWordCount || 2000} words** to provide depth and SEO value.

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
 * @param tool - The specific tool to use for research/generation
 * @returns Article content and research data
 */
export const generateWithResearch = async (
    topic: string,
    settings: Settings,
    cachedResearch?: { prompt: string; response: string },
    tool: ResearchTool = 'perplexity'
): Promise<ResearchResponse> => {
    // If it's a tool we don't handle yet, revert to perplexity or show error
    // For now, only Perplexity is fully implemented.
    // iAsk.ai is "Free", we'll mock it with Perplexity sonar if key exists, otherwise maybe a limited mock.

    const researchToolsWithKeys: Record<ResearchTool, string | undefined> = {
        'perplexity': settings.perplexityApiKey,
        'claude-4-5': settings.claudeApiKey,
        'gemini-deep': settings.geminiApiKey,
        'chatgpt-o1': settings.chatgptApiKey,
        'brave-goggles': settings.braveApiKey,
        'iask-ai': 'free', // Marked as free
        'sudowrite': settings.sudowriteApiKey,
        'novelcrafter': settings.novelcrafterApiKey,
        'character-ai': settings.characterAiApiKey
    };

    const apiKey = researchToolsWithKeys[tool];

    if (!apiKey && tool !== 'iask-ai') {
        return { content: '', error: `${tool} API Key is missing. Please add it in Settings.` };
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

            try {
                if (tool === 'claude-4-5') {
                    // Logic for Claude (assuming Anthropic API structure or similar proxy)
                    const response = await fetch('/api/claude', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                        body: JSON.stringify({
                            model: 'claude-3-5-sonnet-20241022',
                            max_tokens: 4096,
                            messages: [{ role: 'user', content: researchPrompt }]
                        })
                    });
                    if (!response.ok) throw new Error(`Claude API Error: ${response.statusText}`);
                    const data = await response.json();
                    researchResponse = data.content[0].text;
                } else if (tool === 'gemini-deep') {
                    // Logic for Gemini Deep Research
                    const response = await fetch(`${GEMINI_API_URL}/v1beta/models/gemini-2.0-flash-thinking-exp:generateContent?key=${apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: `Deep research mode: ${researchPrompt}` }] }]
                        })
                    });
                    if (!response.ok) throw new Error(`Gemini Deep Error: ${response.statusText}`);
                    const data = await response.json();
                    researchResponse = data.candidates[0].content.parts[0].text;
                } else if (tool === 'brave-goggles') {
                    // Brave Search Goggles integration
                    const response = await fetch('/api/brave/v1/web/search', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'X-Subscription-Token': apiKey as string
                        },
                        body: JSON.stringify({ q: topic, goggles_id: 'original_content_only' })
                    });
                    if (!response.ok) throw new Error(`Brave API Error: ${response.statusText}`);
                    const data = await response.json();
                    researchResponse = data.web?.results?.map((r: any) => `${r.title}: ${r.description}`).join('\n\n') || 'No search results found.';
                } else if (tool === 'chatgpt-o1') {
                    // OpenAI o1 Integration
                    const response = await fetch('/api/openai/v1/chat/completions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                        body: JSON.stringify({
                            model: 'o1-preview',
                            messages: [{ role: 'user', content: researchPrompt }]
                        })
                    });
                    if (!response.ok) throw new Error(`OpenAI API Error: ${response.statusText}`);
                    const data = await response.json();
                    researchResponse = data.choices[0].message.content;
                } else if (['sudowrite', 'novelcrafter', 'character-ai'].includes(tool)) {
                    // Persona-based mocks for specialized tools
                    const personas: Record<string, string> = {
                        'sudowrite': 'You are a fiction-focused writing assistant. Provide deep sensory details and narrative arcs for this topic.',
                        'novelcrafter': 'You are a world-building and character development expert. Research this topic with an eye for dramatic tension and lore.',
                        'character-ai': 'You are a charismatic subject matter expert. Discuss this topic with a distinct, engaging personality.'
                    };
                    const response = await fetch(`${PERPLEXITY_API_URL}/chat/completions`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${settings.perplexityApiKey}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: 'sonar',
                            messages: [
                                { role: 'system', content: personas[tool] || 'You are a creative research assistant.' },
                                { role: 'user', content: researchPrompt }
                            ],
                            max_tokens: 2000
                        })
                    });
                    if (!response.ok) throw new Error(`${tool} Persona Mock Error: ${response.statusText}`);
                    const data = await response.json();
                    researchResponse = data.choices[0].message.content;
                } else {
                    // Default to Perplexity for others or if perplexity is explicitly chosen
                    const response = await fetch(`${PERPLEXITY_API_URL}/chat/completions`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${settings.perplexityApiKey || apiKey}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            model: (tool === 'perplexity' && settings.perplexityModel) ? settings.perplexityModel : 'sonar',
                            messages: [
                                { role: 'system', content: 'You are a research assistant. Provide comprehensive, factual research on the given topic.' },
                                { role: 'user', content: researchPrompt }
                            ],
                            max_tokens: 2000,
                        })
                    });
                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        return { content: '', error: errorData.error?.message || `Research API Error: ${response.statusText}` };
                    }
                    const researchData = await response.json();
                    researchResponse = researchData.choices[0].message.content;
                }
            } catch (err) {
                return { content: '', error: err instanceof Error ? err.message : 'Research failed' };
            }
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
    - Ensure the article is **a minimum of ${settings.articleDefaultWordCount || 2000} words** to provide depth and SEO value.

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
export const rewriteToStyle = async (content: string, settings: Settings, customInstructions?: string): Promise<AIResponse> => {
    if (!settings.perplexityApiKey) {
        return { content: '', error: 'Perplexity API Key is missing. Please add it in Settings.' };
    }

    const prompt = `
    Task: Rewrite the following blog article content to strictly adhere to its specific Style Guide instructions, while ENHANCING the structure and formatting.
    
    ${customInstructions ? `Specific Style Instructions for this article:
    ${customInstructions}
    ` : `Global Style Guide:
    ${BLOG_STYLE_GUIDE}`}
    
    Writing & Formatting Rules:
    ${ARTICLE_GUIDELINES}
    
    Target Word Count:
    - Aim for approximately ${settings.articleDefaultWordCount || 3000} words in the rewritten version
    - Maintain the depth and completeness of the original content
    - Do not truncate or significantly shorten the article
    
    original Content:
    ${content}
    
    Instructions:
    - REWRITE the content to match the provided style instructions.
    - RESTRUCTURE the content to match the "Writing Guidelines" above (add H3s, lists, emojis if missing).
    - Ensure all Output Rules are met (valid Markdown, no intro/outro).
    - **CRITICAL**: Do NOT remove Markdown headers (#, ##, etc.). ENHANCE them.
    - **CRITICAL**: Maintain approximately ${settings.articleDefaultWordCount || 3000} words.
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
                max_tokens: 6000,
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

    // Safety Check: Very long articles (approx > 15,000 chars) might hit output limits
    if (content.length > 20000) {
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
Target Word Count: Maintain approximately ${settings.articleDefaultWordCount || 3000} words

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
                max_tokens: 6000,
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
    isHero?: boolean;
    heroReasoning?: string; // Analysis of visual choices
}

export const DEFAULT_NANOBANANA_GUIDELINES = `For each identified section, create a high-fidelity, photorealistic image generation prompt for NanoBanana. 
Focus on:
- **Composition**: Use intentional framing (rule of thirds, leading lines), specify perspective (low angle, wide shot, extreme close-up).
- **Lighting**: Specify cinematic lighting (golden hour, volumetric fog, rim lighting, moody noir, or high-key professional).
- **Style**: Modern, premium aesthetic with deep contrast and vibrant but realistic color grading.
- **Detail**: Include technical camera terms (85mm lens, f/1.8, high dynamic range) and specific textures.
Each prompt should be a vivid, self-contained scene description. Avoid buzzwords like "photorealistic" in the prompt itself; instead, describe the light, texture, and lens effects that imply it.`;

/**
 * Generates image prompts for major blog sections using Gemini
 */
export const generateImagePrompts = async (content: string, settings: Settings, customInstructions?: string, modelGuidelines?: string): Promise<{ prompts: ImagePromptDraft[], error?: string }> => {
    if (!settings.geminiApiKey) {
        return { prompts: [], error: 'Gemini API Key is missing. Please add it in Settings.' };
    }

    const guidelines = modelGuidelines || DEFAULT_NANOBANANA_GUIDELINES;

    // Layout Configuration
    const targetImageCount = settings.layoutNumImages || 3;
    const includeHero = settings.layoutIncludeHero !== false; // Default true if undefined
    const layoutInstructions = settings.layoutInstructions || '';

    // 1. Extract actual headers from content
    const headerRegex = /^(#{1,3})\s+(.+)$/gm;
    const headers: string[] = [];
    let match;
    while ((match = headerRegex.exec(content)) !== null) {
        headers.push(match[2].trim());
    }

    const promptText = `Analyze the following blog post and create image generation prompts for the best sections to illustrate.
    
    CRITICAL CONSTRAINT: You must generate exactly ${targetImageCount} prompts in total. 

    LAYOUT PRIORITY: Your primary goal is to follow the "Configuration & Placement Rules" below. Only if the rules are vague should you use your own judgement to distribute images. 
    - **CRITICAL**: If the rules say "all at the top", "cluster at start", etc., you MUST use "Introduction" for ALL body images and IGNORE the numbered headers for "sectionTitle".
    - **CRITICAL**: Do NOT distribute across headers if the user explicitly asks for a single location.

    CRITICAL: You MUST use the EXACT section titles provided below for the "sectionTitle" field. Do not modify, shorten, or paraphrase them.

    Available Sections (use these EXACT titles):
    1. "Introduction" (Virtual section representing the very top of the article)
    ${headers.length > 0 ? headers.map((h, i) => `${i + 2}. "${h}"`).join('\n') : ''}

    ${guidelines}

    ${layoutInstructions ? `Configuration & Placement Rules:\n${layoutInstructions}` : ''}
    ${customInstructions ? `Additional Style/User Instructions:\n${customInstructions}` : ''}

    For each section, provide:
    1. A short, descriptive "sectionTitle" (MUST match one of the titles above exactly, or "Hero Image" if applicable).
    2. A highly detailed image generation prompt (approx 60-100 words).
    3. Rationale: Why this visual represents this specific section.
    
    ${includeHero ? `
    CRITICAL CONSTRAINT: One of the ${targetImageCount} prompts MUST be the "Hero" prompt. 
    The "Hero" visual should NOT just be a literal scene from the text, but a 'gestalt' interpretation—a high-impact conceptual visual that captures the soul and central theme of the entire article. Mark this one as "isHero: true".
    **Hero Reasoning**: For the Hero image, you MUST provide a "heroReasoning" field in the JSON explaining the conceptual choices and how they represent the article's core theme.
    
    If the Hero image best fits the Article Title or Introduction, you may use "Hero Image", "Introduction", or the Article Title as the "sectionTitle" for that specific prompt only.
    ` : `
    CRITICAL CONSTRAINT: Do NOT generate a "Hero" image. Do NOT set "isHero" to true for any prompt. Focus only on the body content sections.
    `}

    Return ONLY a valid JSON object. No markdown formatting. No code comments (// or /*). No trailing commas.

    Post Content:
    ${content}

    Format your response as a JSON object with a "prompts" array. Each object in the array should have fields: "sectionTitle", "prompt", "rationale", "isHero" (boolean), and "heroReasoning" (string, for hero only).
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
                    maxOutputTokens: 4096,
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return { prompts: [], error: errorData.error?.message || `Gemini API Error: ${response.statusText}` };
        }

        const data = await response.json();
        let contentStr = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Robust JSON extraction: Find the first '{' and the last '}'
        const firstBrace = contentStr.indexOf('{');
        const lastBrace = contentStr.lastIndexOf('}');

        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            contentStr = contentStr.substring(firstBrace, lastBrace + 1);
        } else {
            // Fallback: try cleaning markdown if no clear JSON object found
            if (contentStr.includes('```json')) {
                contentStr = contentStr.split('```json')[1].split('```')[0].trim();
            } else if (contentStr.includes('```')) {
                contentStr = contentStr.split('```')[1].split('```')[0].trim();
            }
        }

        try {
            const parsed = JSON.parse(contentStr);
            const prompts = Array.isArray(parsed) ? parsed : (parsed.prompts || []);
            // Enforce the count limit from settings
            return { prompts: prompts.slice(0, targetImageCount) };
        } catch (parseError) {
            console.error('Failed to parse Gemini response as JSON. Raw text:', contentStr);
            console.error('Parse Error:', parseError);
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
