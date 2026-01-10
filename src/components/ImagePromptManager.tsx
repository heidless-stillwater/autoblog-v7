import React, { useState, useEffect } from 'react';
import {
    Trash2,
    Edit2,
    Copy,
    Target,
    ImageIcon,
    CheckSquare,
    Save,
    X,
    Star,
    ChevronDown,
    ChevronUp,
    AlertCircle,
    Download,
    Upload,
    Square,
    Sparkles,
    LayoutTemplate,
    Plus,
    Loader2,
    RotateCcw,
    ArrowUp,
    ArrowDown
} from 'lucide-react';

import PromptConfigModal from './PromptConfigModal';
import { useStore } from '../store';
import { generateImagePrompts, generateImage, DEFAULT_NANOBANANA_GUIDELINES } from '../services/aiService';
import type { ImagePrompt, StyleOptions, PromptPreset } from '../types';
import ConfirmModal from './ConfirmModal';
import clsx from 'clsx';
import { format } from 'date-fns';
import { compressImage } from '../utils/imageUtils';

interface ImagePromptManagerProps {
    articleId: string;
    topic: string;
    content: string;
    onUpdateContent: (newContent: string) => void;
    onJumpToSection?: (sectionTitle: string) => void;
}

const ImagePromptManager = ({ articleId, topic, content, onUpdateContent, onJumpToSection }: ImagePromptManagerProps) => {
    const {
        imagePrompts,
        addImagePrompt,
        updateImagePrompt,
        deleteImagePrompt,
        loadImagePrompts,
        settings,
        addMedia,
        articles,
        updateArticle
    } = useStore();

    const [isGenerating, setIsGenerating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(true);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
    const [isProcessing, setIsProcessing] = useState(false);
    const [viewingHistoryTitle, setViewingHistoryTitle] = useState<string | null>(null);
    const [generationProgress, setGenerationProgress] = useState<{
        current: number,
        total: number,
        message: string
    } | null>(null);

    // Quick Generate States
    const [genPromptCustom, setGenPromptCustom] = useState('');
    const [selectedLocation, setSelectedLocation] = useState('top');
    const [selectedDirection, setSelectedDirection] = useState<'above' | 'below'>('above');
    const [isQuickGenerating, setIsQuickGenerating] = useState(false);
    const [shouldGenerateNow, setShouldGenerateNow] = useState(true);

    // Form states
    const [editTitle, setEditTitle] = useState('');
    const [editPrompt, setEditPrompt] = useState('');
    const [editIsHero, setEditIsHero] = useState(false);
    const [styleOptions, setStyleOptions] = useState<StyleOptions>(
        settings.defaultStyleOptions || {
            composition: '',
            medium: '',
            lighting: '',
            mood: ''
        }
    );
    const [customInstructions, setCustomInstructions] = useState(settings.defaultCustomInstructions || '');
    const [modelGuidelines, setModelGuidelines] = useState(settings.defaultModelGuidelines || DEFAULT_NANOBANANA_GUIDELINES);
    const [showConfig, setShowConfig] = useState(false);

    const [selectedPresetId, setSelectedPresetId] = useState<string | null>(settings.activePromptPresetId || 'preset-standard-vintage');

    const currentArticle = articles.find(a => a.id === articleId);

    // Layout Config State (Per-Article)
    // We initialize from article IF it exists, otherwise we fallback to global settings.
    const [layoutConfig, setLayoutConfig] = useState({
        imageCount: (currentArticle?.layoutConfig?.imageCount ?? settings.layoutNumImages) || 3,
        includeHero: (currentArticle?.layoutConfig?.includeHero ?? settings.layoutIncludeHero) ?? true,
        instructions: (currentArticle?.layoutConfig?.instructions ?? settings.layoutInstructions) || ''
    });
    const [activeLayoutPresetId, setActiveLayoutPresetId] = useState<string | null>(
        (currentArticle?.activeLayoutPresetId ?? settings.activeLayoutPresetId) || 'preset-base-layout-0'
    );

    // Sync with global settings if this article hasn't been customized yet
    useEffect(() => {
        if (!currentArticle?.layoutConfig && !currentArticle?.activeLayoutPresetId) {
            setLayoutConfig({
                imageCount: settings.layoutNumImages || 3,
                includeHero: settings.layoutIncludeHero ?? true,
                instructions: settings.layoutInstructions || ''
            });
            setActiveLayoutPresetId(settings.activeLayoutPresetId || 'preset-base-layout-0');
        }
    }, [settings, currentArticle]);

    const [confirmModal, setConfirmModal] = useState<{
        message: string | React.ReactNode;
        onConfirm: () => void;
        onCancel?: () => void;
        confirmText?: string;
        cancelText?: string;
        showCancel?: boolean;
    } | null>(null);

    const [batchChoice, setBatchChoice] = useState<'use-existing' | 'regenerate' | null>(null);

    // Persist layout changes to article ONLY IF they differ from what's currently saved
    useEffect(() => {
        if (currentArticle) {
            const hasChanged =
                currentArticle.activeLayoutPresetId !== activeLayoutPresetId ||
                JSON.stringify(currentArticle.layoutConfig) !== JSON.stringify(layoutConfig);

            // Only update if there's a real difference
            if (hasChanged) {
                updateArticle(articleId, {
                    layoutConfig,
                    activeLayoutPresetId
                });
            }
        }
    }, [layoutConfig, activeLayoutPresetId, articleId, currentArticle, updateArticle]);

    const STANDARD_PRESETS: PromptPreset[] = [
        {
            id: 'preset-standard-cinematic',
            name: '🎬 Epic Cinematic',
            styleOptions: {
                composition: 'wide angle shot',
                medium: 'award-winning professional photography',
                lighting: 'cinematic lighting with volumetric fog',
                mood: 'epic heroic atmosphere'
            },
            customInstructions: 'Focus on grand scale and heroic atmosphere.',
            modelGuidelines: DEFAULT_NANOBANANA_GUIDELINES,
            createdAt: 0
        },
        {
            id: 'preset-standard-minimalist',
            name: '✨ Modern Minimal',
            styleOptions: {
                composition: 'perfectly symmetrical framing',
                medium: 'clean minimalist vector art',
                lighting: 'soft studio box lighting',
                mood: 'clean professional minimalist mood'
            },
            customInstructions: 'Maintain high contrast and lots of negative space.',
            modelGuidelines: DEFAULT_NANOBANANA_GUIDELINES,
            createdAt: 0
        },
        {
            id: 'preset-standard-cyberpunk',
            name: '🎆 Neon Cyberpunk',
            styleOptions: {
                composition: 'rule of thirds composition',
                medium: 'hyperrealistic 3D render, octane render',
                lighting: 'neon glow, high contrast lighting',
                mood: 'bold vibrant energetic colors'
            },
            customInstructions: 'Heavy emphasis on cyan and magenta accents.',
            modelGuidelines: DEFAULT_NANOBANANA_GUIDELINES,
            createdAt: 0
        },
        {
            id: 'preset-standard-vintage',
            name: '📜 Vintage Nostalgia',
            styleOptions: {
                composition: 'rule of thirds composition',
                medium: 'expressive classical oil painting',
                lighting: 'warm golden hour sunlight',
                mood: 'warm nostalgic vintage feel'
            },
            customInstructions: 'Soft focus and romanticized atmosphere.',
            modelGuidelines: DEFAULT_NANOBANANA_GUIDELINES,
            createdAt: 0
        },
        {
            id: 'preset-standard-noir',
            name: '🕶️ Dramatic Noir',
            styleOptions: {
                composition: 'powerful low angle perspective',
                medium: 'award-winning professional photography',
                lighting: 'dramatic high-contrast noir shadows',
                mood: 'dark moody atmospheric feel'
            },
            customInstructions: 'Monochromatic or extremely desaturated color palette.',
            modelGuidelines: DEFAULT_NANOBANANA_GUIDELINES,
            createdAt: 0
        },
        {
            id: 'preset-standard-macro',
            name: '🔍 Macro Precision',
            styleOptions: {
                composition: 'extremely detailed macro close-up',
                medium: 'award-winning professional photography',
                lighting: 'soft studio box lighting',
                mood: 'clean professional minimalist mood'
            },
            customInstructions: 'Extreme detail on textures and micro-features.',
            modelGuidelines: DEFAULT_NANOBANANA_GUIDELINES,
            createdAt: 0
        }
    ];

    const allPresets = [
        ...STANDARD_PRESETS,
        ...(settings.promptPresets || [])
    ];

    useEffect(() => {
        loadImagePrompts(articleId);
    }, [articleId]);

    // Initialize default preset on mount
    useEffect(() => {
        if (selectedPresetId) {
            handleApplyPreset(selectedPresetId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const findHeaderIndex = (sectionTitle: string, articleContent: string): number => {
        console.log('🔍 Finding header for section:', sectionTitle);

        const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const lowerTitle = sectionTitle.toLowerCase();

        // Special case for hero image or top-of-article sections
        const topMarkers = ['hero image', 'hero', 'introduction', 'intro', 'top', 'start', 'beginning'];
        if (topMarkers.some(marker => lowerTitle === marker || lowerTitle.includes(marker))) {
            console.log('✅ Top-of-article section detected, inserting at start');
            return 0;
        }

        // Special case for bottom-of-article sections
        const bottomMarkers = ['conclusion', 'bottom', 'end', 'footer'];
        if (bottomMarkers.some(marker => lowerTitle === marker || lowerTitle.includes(marker))) {
            console.log('✅ Bottom-of-article section detected, inserting at end');
            return -2; // Special code for "absolute bottom" to distinguish from "not found"
        }

        // Strategy 1: Exact match
        const escapedTitle = escapeRegExp(sectionTitle);
        const exactRegex = new RegExp(`^#+\\s+${escapedTitle}\\s*$`, 'im');
        const exactMatch = articleContent.match(exactRegex);
        if (exactMatch && exactMatch.index !== undefined) {
            console.log('✅ Exact match found at index:', exactMatch.index);
            return exactMatch.index;
        }

        // Strategy 2: Partial match
        const partialRegex = new RegExp(`^#+\\s+.*${escapedTitle}.*`, 'im');
        const partialMatch = articleContent.match(partialRegex);
        if (partialMatch && partialMatch.index !== undefined) {
            console.log('✅ Partial match found at index:', partialMatch.index);
            return partialMatch.index;
        }

        // Strategy 3: Sanitized fuzzy match
        const sanitize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
        const sanitizedTitle = sanitize(sectionTitle);
        const lines = articleContent.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('#')) {
                const headerText = line.replace(/^#+\s+/, '');
                const sanitizedLine = sanitize(headerText);

                // Check if either contains the other (more lenient matching)
                if (sanitizedLine.includes(sanitizedTitle) || sanitizedTitle.includes(sanitizedLine)) {
                    let currentPos = 0;
                    for (let j = 0; j < i; j++) {
                        currentPos += lines[j].length + 1;
                    }
                    console.log('✅ Fuzzy match found:', headerText, 'at index:', currentPos);
                    return currentPos;
                }
            }
        }

        // Log all available headers for debugging
        const allHeaders = articleContent.match(/^#+\s+.+$/gm);
        console.warn('❌ Header not found for section:', sectionTitle);
        console.log('📋 Available headers in article:', allHeaders);

        return -1;
    };

    const extractHeaders = (articleContent: string) => {
        const lines = articleContent.split('\n');
        const headers: { text: string; level: number }[] = [];
        lines.forEach(line => {
            const match = line.match(/^(#{1,3})\s+(.+)$/);
            if (match) {
                headers.push({
                    level: match[1].length,
                    text: match[2].trim()
                });
            }
        });
        return headers;
    };

    const allPrompts = imagePrompts.filter(p => p.articleId === articleId);

    const getPromptPosition = (p: ImagePrompt): number => {
        if (p.isHero || p.sectionTitle.toLowerCase() === 'hero image') return -100;

        let sectionTitle = p.sectionTitle;
        // Strip prefixes added by Quick Gen
        if (sectionTitle.startsWith('Custom (')) {
            const match = sectionTitle.match(/\((.+)\)/);
            if (match) sectionTitle = match[1];
        } else if (sectionTitle.startsWith('Custom: ')) {
            sectionTitle = sectionTitle.replace('Custom: ', '');
        }

        if (sectionTitle === 'top') return -50;
        if (sectionTitle === 'bottom') return content.length + 1000;

        const idx = findHeaderIndex(sectionTitle, content);
        if (idx === -2) return content.length + 500; // bottom markers
        if (idx === -1) return content.length + 2000; // not found, put at end
        return idx;
    };

    const filteredPrompts = allPrompts
        .filter(p => !allPrompts.some(other => other.sectionTitle === p.sectionTitle && (other.version || 1) > (p.version || 1)))
        .sort((a, b) => {
            const posA = getPromptPosition(a);
            const posB = getPromptPosition(b);
            if (posA !== posB) return posA - posB;
            return a.createdAt - b.createdAt;
        });

    const handleGenerate = async () => {
        if (filteredPrompts.length > 0) {
            setConfirmModal({
                message: 'A set of image prompts already exists for this article. Do you want to overwrite them?',
                confirmText: 'Overwrite',
                onConfirm: async () => {
                    setConfirmModal(null);
                    for (const p of filteredPrompts) {
                        await deleteImagePrompt(p.id);
                    }
                    performGenerate();
                },
                onCancel: () => setConfirmModal(null)
            });
            return;
        }
        performGenerate();
    };

    const handleApplyPreset = (id: string | null) => {
        if (!id) {
            setSelectedPresetId(null);
            return;
        }
        const preset = allPresets.find(p => p.id === id);
        if (preset) {
            setStyleOptions(preset.styleOptions || {
                composition: '',
                medium: '',
                lighting: '',
                mood: ''
            });
            setCustomInstructions(preset.customInstructions || '');
            setModelGuidelines(preset.modelGuidelines || DEFAULT_NANOBANANA_GUIDELINES);
            setSelectedPresetId(id);
        }
    };

    const handleLayoutPresetChange = (id: string | null) => {
        if (!id) {
            setActiveLayoutPresetId(null);
            return;
        }
        const preset = (settings.layoutPresets || []).find(p => p.id === id);
        if (preset) {
            setLayoutConfig({
                imageCount: preset.imageCount,
                includeHero: preset.includeHero,
                instructions: preset.placementInstructions
            });
            setActiveLayoutPresetId(id);
        }
    };


    const performGenerate = async () => {
        setIsGenerating(true);
        setError(null);
        try {
            // Combine style options with custom instructions
            const style = styleOptions || { composition: '', medium: '', lighting: '', mood: '' };
            const styleParts = Object.values(style).filter(v => !!v);
            const combinedInstructions = [
                ...styleParts,
                ...(customInstructions ? [customInstructions] : [])
            ].join(', ');

            // Inject local layout configuration
            console.log('[ImagePromptManager] Generating with layout instructions:', layoutConfig.instructions);
            const syntheticSettings = {
                ...settings,
                layoutNumImages: layoutConfig.imageCount,
                layoutIncludeHero: layoutConfig.includeHero,
                layoutInstructions: layoutConfig.instructions
            };

            const { prompts: aiPrompts, error: aiError } = await generateImagePrompts(content, syntheticSettings, combinedInstructions, modelGuidelines);
            if (aiError) {
                setError(aiError);
            } else {
                aiPrompts.sort((a, b) => {
                    if (a.isHero && !b.isHero) return -1;
                    if (!a.isHero && b.isHero) return 1;
                    return 0;
                });

                console.table(aiPrompts.map(p => ({ title: p.sectionTitle, isHero: p.isHero, rationale: p.rationale?.substring(0, 30) + '...' })));

                for (let i = 0; i < aiPrompts.length; i++) {
                    const draft = aiPrompts[i];

                    // Find existing prompt for this section to handle versioning
                    const existing = allPrompts.find(p => p.sectionTitle === draft.sectionTitle);
                    const newVersion = (existing?.version || 1) + 1;
                    const previousId = existing?.id;

                    await addImagePrompt({
                        articleId,
                        topic,
                        sectionTitle: draft.sectionTitle || 'Untitled Section',
                        prompt: draft.prompt || '',
                        rationale: draft.rationale || '',
                        isHero: !!draft.isHero,
                        heroReasoning: draft.heroReasoning || '',
                        presetId: selectedPresetId || undefined,
                        version: existing ? newVersion : 1,
                        previousVersionId: previousId || '',
                        createdAt: Date.now() + i,
                        updatedAt: Date.now() + i
                    });
                }
                setShowConfig(false); // Hide config after successful generation
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            setError(`Failed to generate prompts: ${msg}. Please check your AI settings.`);
            console.error(err);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleUpdatePresetForPrompt = async (promptId: string, pId: string) => {
        await updateImagePrompt(promptId, { presetId: pId });
    };

    const handleStartEdit = (prompt: ImagePrompt) => {
        setEditingId(prompt.id);
        setEditTitle(prompt.sectionTitle);
        setEditPrompt(prompt.prompt);
        setEditIsHero(!!prompt.isHero);
    };

    const handleSaveEdit = async (id: string) => {
        if (!editTitle || !editPrompt) return;
        try {
            await updateImagePrompt(id, {
                sectionTitle: editTitle,
                prompt: editPrompt,
                isHero: editIsHero
            });
            setEditingId(null);
            setEditTitle('');
            setEditPrompt('');
            setEditIsHero(false);
        } catch (err) {
            setError('Failed to update prompt.');
        }
    };

    const handleDelete = async (id: string) => {
        setConfirmModal({
            message: 'Are you sure you want to delete this prompt?',
            confirmText: 'Delete',
            onConfirm: async () => {
                setConfirmModal(null);
                try {
                    await deleteImagePrompt(id);
                    setSelectedIds(prev => {
                        const next = new Set(prev);
                        next.delete(id);
                        return next;
                    });
                } catch (err) {
                    setError('Failed to delete prompt.');
                }
            },
            onCancel: () => setConfirmModal(null)
        });
    };

    const handleClearAll = async () => {
        setConfirmModal({
            message: 'Are you sure you want to delete ALL prompts for this article?',
            confirmText: 'Clear All',
            onConfirm: async () => {
                setConfirmModal(null);
                try {
                    for (const p of filteredPrompts) {
                        await deleteImagePrompt(p.id);
                    }
                    setSelectedIds(new Set());
                } catch (err) {
                    setError('Failed to clear all prompts.');
                }
            },
            onCancel: () => setConfirmModal(null)
        });
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        if (selectedIds.size === filteredPrompts.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredPrompts.map(p => p.id)));
        }
    };



    const handleQuickGenerate = async () => {
        if (!genPromptCustom || !content) return;
        setIsQuickGenerating(true);
        setError(null);

        try {
            if (shouldGenerateNow) {
                const result = await generateImage(genPromptCustom, settings);
                if (result.error) {
                    setError(result.error);
                    setIsQuickGenerating(false);
                    return;
                }

                if (result.imageUrl) {
                    const compressedUrl = await compressImage(result.imageUrl, 700 * 1024, 1024, 0.7);

                    const article = articles.find(a => a.id === articleId);
                    const articleTitle = article?.topic || 'Unknown Article';

                    await addMedia({
                        name: `QuickGen-${selectedLocation.slice(0, 10)}-${Date.now()}.jpg`,
                        type: 'image/jpeg',
                        url: compressedUrl,
                        createdAt: Date.now(),
                        size: Math.round((compressedUrl.length * 3) / 4),
                        tags: [
                            `Article: ${articleId} - ${articleTitle}`,
                            'QuickGen'
                        ],
                        mediaPrompt: genPromptCustom,
                        usedIn: [articleId]
                    });

                    const imageMarkdown = `\n![Custom Image](${compressedUrl})\n\n`;
                    let newContent = content;
                    let insertionIndex = 0;

                    if (selectedLocation === 'top') {
                        if (selectedDirection === 'above') {
                            insertionIndex = 0;
                        } else {
                            const firstNewline = content.indexOf('\n');
                            insertionIndex = firstNewline === -1 ? content.length : firstNewline + 1;
                        }
                    } else if (selectedLocation === 'bottom') {
                        if (selectedDirection === 'above') {
                            const lastNewline = content.lastIndexOf('\n', content.length - 2);
                            insertionIndex = lastNewline === -1 ? 0 : lastNewline + 1;
                        } else {
                            insertionIndex = content.length;
                        }
                    } else {
                        const headerIndex = findHeaderIndex(selectedLocation, content);
                        if (headerIndex >= 0) {
                            if (selectedDirection === 'above') {
                                insertionIndex = headerIndex;
                            } else {
                                const nextNewline = content.indexOf('\n', headerIndex);
                                insertionIndex = nextNewline === -1 ? content.length : nextNewline + 1;
                            }
                        } else {
                            insertionIndex = content.length;
                        }
                    }

                    newContent = content.slice(0, insertionIndex) + imageMarkdown + content.slice(insertionIndex);
                    onUpdateContent(newContent);

                    await addImagePrompt({
                        articleId,
                        topic,
                        sectionTitle: selectedLocation === 'top' || selectedLocation === 'bottom'
                            ? `Custom (${selectedLocation})`
                            : `Custom: ${selectedLocation}`,
                        prompt: genPromptCustom,
                        imageUrl: compressedUrl,
                        isImageInserted: true,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                        version: 1
                    });
                }
            } else {
                // Just add to prompt list
                await addImagePrompt({
                    articleId,
                    topic,
                    sectionTitle: selectedLocation === 'top' || selectedLocation === 'bottom'
                        ? `Custom (${selectedLocation})`
                        : `Custom: ${selectedLocation}`,
                    prompt: genPromptCustom,
                    isImageInserted: false,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    version: 1
                });
            }

            setGenPromptCustom('');
            setError(null);
        } catch (err) {
            setError(`Failed to handle custom prompt: ${err instanceof Error ? err.message : 'Unknown error'}`);
            console.error(err);
        } finally {
            setIsQuickGenerating(false);
        }
    };

    const insertPromptAsQuote = async (prompt: ImagePrompt) => {
        const headerIndex = findHeaderIndex(prompt.sectionTitle, content);
        const quote = `\n> **AI Image Prompt:** ${prompt.prompt}\n\n`;
        let newContent = content;
        if (headerIndex !== -1) {
            newContent = content.slice(0, headerIndex) + quote + content.slice(headerIndex);
        } else {
            newContent = content + quote;
        }
        onUpdateContent(newContent);
        await updateImagePrompt(prompt.id, { isPromptInserted: true });
    };

    const generateImageOnly = async (prompt: ImagePrompt): Promise<{ compressedUrl: string, promptId: string, finalPromptText: string } | null> => {
        setProcessingIds(prev => new Set(prev).add(prompt.id));
        try {
            let finalPromptText = prompt.prompt;
            const pId = prompt.presetId;
            if (pId) {
                const preset = allPresets.find(p => p.id === pId);
                if (preset) {
                    const styleParts = Object.values(preset.styleOptions || {}).filter(v => !!v);
                    if (styleParts.length > 0) {
                        finalPromptText = `${prompt.prompt}, style: ${styleParts.join(', ')}`;
                    }
                }
            }
            if (layoutConfig.instructions && layoutConfig.instructions.trim()) {
                finalPromptText = `${finalPromptText}. Guidance: ${layoutConfig.instructions.trim()}`;
            }

            const result = await generateImage(finalPromptText, settings);
            if (result.error || !result.imageUrl) return null;

            const compressedUrl = await compressImage(result.imageUrl, 700 * 1024, 1024, 0.7);
            return { compressedUrl, promptId: prompt.id, finalPromptText };
        } catch (err) {
            console.error(err);
            return null;
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(prompt.id);
                return next;
            });
        }
    };
    const runBulkGeneration = async (selected: ImagePrompt[], choice: 'use-existing' | 'regenerate' | null) => {
        setIsProcessing(true);
        setGenerationProgress({ current: 0, total: selected.length, message: 'Starting bulk processing...' });

        try {
            // 1. Parallel Generation/Selection Stage
            const results: ({ compressedUrl: string, promptId: string, finalPromptText: string } | null)[] = [];
            let completed = 0;

            await Promise.all(selected.map(async (p) => {
                let res: { compressedUrl: string, promptId: string, finalPromptText: string } | null = null;

                if (p.imageUrl && choice === 'use-existing') {
                    res = { compressedUrl: p.imageUrl, promptId: p.id, finalPromptText: p.prompt };
                } else {
                    res = await generateImageOnly(p);
                }

                completed++;
                setGenerationProgress(prev => prev ? {
                    ...prev,
                    current: completed,
                    message: `Processed ${completed} of ${selected.length} images...`
                } : null);
                results.push(res);
            }));

            setGenerationProgress(prev => prev ? { ...prev, message: 'Inserting into article...' } : null);

            // 2. Sequential Insertion Stage (to preserve order)
            let currentContent = content;

            // Detect if we are clustering at the top or bottom
            const firstBodyPrompt = selected.find(p => !p.isHero && p.sectionTitle.toLowerCase() !== 'hero image');
            const targetIndex = firstBodyPrompt ? findHeaderIndex(firstBodyPrompt.sectionTitle, currentContent) : 0;

            const shouldReverse = targetIndex === 0;
            const processedList = shouldReverse ? [...selected].reverse() : [...selected];

            for (let i = 0; i < processedList.length; i++) {
                const p = processedList[i];
                const result = results.find(r => r?.promptId === p.id);
                if (!result) continue;

                const article = articles.find(a => a.id === articleId);
                const hasHero = article?.heroImage && article.heroImage.trim() !== '' && article.heroImage !== 'null';

                const originalIndex = selected.findIndex(item => item.id === p.id);
                const shouldSetHero = originalIndex === 0 && !hasHero;

                const compressedUrl = result.compressedUrl;
                const finalPromptText = result.finalPromptText || p.prompt;

                // Only add to media library if it was actually regenerated
                // If it was reused, it's already in the library.
                const isReused = p.imageUrl && choice === 'use-existing';
                if (!isReused) {
                    const articleTitle = article?.topic || 'Unknown Article';
                    await addMedia({
                        name: `Section-${p.sectionTitle.replace(/\s+/g, '-')}-${Date.now()}.jpg`,
                        type: 'image/jpeg',
                        url: compressedUrl,
                        createdAt: Date.now(),
                        size: Math.round((compressedUrl.length * 3) / 4),
                        tags: [
                            `Article: ${articleId} - ${articleTitle}`,
                            'CustomPromptUser'
                        ],
                        mediaPrompt: finalPromptText,
                        usedIn: [articleId]
                    });
                }

                const isHeroImage = !!p.isHero || p.sectionTitle.toLowerCase() === 'hero image';
                if (shouldSetHero && isHeroImage) {
                    await updateArticle(articleId, { heroImage: compressedUrl });
                }

                if (isHeroImage) {
                    await updateImagePrompt(p.id, { isImageInserted: true, imageUrl: compressedUrl });
                } else {
                    const headerIndex = findHeaderIndex(p.sectionTitle, currentContent);
                    const imageMarkdown = `\n![${p.sectionTitle}](${compressedUrl})\n\n`;

                    if (headerIndex >= 0) {
                        currentContent = currentContent.slice(0, headerIndex) + imageMarkdown + currentContent.slice(headerIndex);
                    } else {
                        currentContent = currentContent + imageMarkdown;
                    }
                    await updateImagePrompt(p.id, { isImageInserted: true, imageUrl: compressedUrl });
                }
            }

            onUpdateContent(currentContent);
        } catch (err) {
            console.error('Bulk generation error:', err);
            setError(`Bulk processing failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setIsProcessing(false);
            setGenerationProgress(null);
            setSelectedIds(new Set());
        }
    };

    const showSmartChoiceModal = (title: string, onChoice: (choice: 'use-existing' | 'regenerate', applyToAll: boolean) => void) => {
        let applyToAll = false;
        setConfirmModal({
            message: (
                <div className="space-y-4">
                    <p className="text-slate-300">
                        An image already exists for <span className="text-white font-bold">{title}</span>.
                        Would you like to use the existing image or regenerate a new one?
                    </p>
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                        <input
                            type="checkbox"
                            id="applyToAll"
                            onChange={(e) => applyToAll = e.target.checked}
                            className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                        />
                        <label htmlFor="applyToAll" className="text-xs text-slate-400 cursor-pointer">Apply choice to all existing images in this batch</label>
                    </div>
                </div>
            ),
            confirmText: 'Regenerate',
            cancelText: 'Use Existing',
            onConfirm: () => {
                setConfirmModal(null);
                onChoice('regenerate', applyToAll);
            },
            onCancel: () => {
                setConfirmModal(null);
                onChoice('use-existing', applyToAll);
            }
        });
    };

    const generateAndInsertImage = async (
        prompt: ImagePrompt,
        baseContent: string,
        shouldSetHero: boolean = true,
        existingImageUrl?: string
    ): Promise<string | null> => {
        console.log(`🚀 [generateAndInsertImage] Processing: "${prompt.sectionTitle}" (isHero: ${prompt.isHero}) ${existingImageUrl ? '[USING EXISTING]' : ''}`);
        setProcessingIds(prev => new Set(prev).add(prompt.id));
        setError(null);
        try {
            let compressedUrl = existingImageUrl || '';

            if (!compressedUrl) {
                let finalPromptText = prompt.prompt;

                // Find and apply specific preset styles if assigned
                const pId = prompt.presetId;
                if (pId) {
                    const preset = allPresets.find(p => p.id === pId);
                    if (preset) {
                        const styleParts = Object.values(preset.styleOptions || {}).filter(v => !!v);
                        if (styleParts.length > 0) {
                            finalPromptText = `${prompt.prompt}, style: ${styleParts.join(', ')}`;
                        }
                    }
                }

                // Append layout instructions if present (from local article config)
                if (layoutConfig.instructions && layoutConfig.instructions.trim()) {
                    finalPromptText = `${finalPromptText}. Guidance: ${layoutConfig.instructions.trim()}`;
                }

                const result = await generateImage(finalPromptText, settings);
                if (result.error) {
                    setError(result.error);
                    return null;
                }

                if (result.imageUrl) {
                    compressedUrl = await compressImage(result.imageUrl, 700 * 1024, 1024, 0.7);

                    // Get article title for tagging
                    const article = articles.find(a => a.id === articleId);
                    const articleTitle = article?.topic || 'Unknown Article';

                    await addMedia({
                        name: `Section-${prompt.sectionTitle.replace(/\s+/g, '-')}-${Date.now()}.jpg`,
                        type: 'image/jpeg',
                        url: compressedUrl,
                        createdAt: Date.now(),
                        size: Math.round((compressedUrl.length * 3) / 4),
                        tags: [
                            `Article: ${articleId} - ${articleTitle}`,
                            'CustomPromptUser'
                        ],
                        mediaPrompt: finalPromptText,
                        usedIn: [articleId]
                    });
                } else {
                    return null;
                }
            }

            // SHARED INSERTION LOGIC
            const isHeroImage = !!prompt.isHero || prompt.sectionTitle.toLowerCase() === 'hero image';

            if (shouldSetHero && isHeroImage) {
                const article = articles.find(a => a.id === articleId);
                const hasHero = article?.heroImage && article.heroImage.trim() !== '' && article.heroImage !== 'null';
                if (!hasHero) {
                    await updateArticle(articleId, { heroImage: compressedUrl });
                }
            }

            if (isHeroImage) {
                console.log(`✨ [generateAndInsertImage] Skipping body insertion for Hero image: "${prompt.sectionTitle}"`);
                await updateImagePrompt(prompt.id, { isImageInserted: true, imageUrl: compressedUrl });
                return baseContent;
            }

            console.log(`📝 [generateAndInsertImage] Inserting into body: "${prompt.sectionTitle}"`);
            const headerIndex = findHeaderIndex(prompt.sectionTitle, baseContent);
            const imageMarkdown = `\n![${prompt.sectionTitle}](${compressedUrl})\n\n`;
            let newContent = baseContent;
            if (headerIndex >= 0) {
                newContent = baseContent.slice(0, headerIndex) + imageMarkdown + baseContent.slice(headerIndex);
            } else {
                newContent = baseContent + imageMarkdown;
            }
            await updateImagePrompt(prompt.id, { isImageInserted: true, imageUrl: compressedUrl });
            return newContent;
        } catch (err) {
            setError(`Failed to generate image with NanoBanana: ${err instanceof Error ? err.message : 'Unknown error'}`);
            console.error(err);
            return null;
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(prompt.id);
                return next;
            });
        }
    };

    const handleBackup = () => {
        const timestamp = format(new Date(), 'yyyyMMdd-HHmmss');
        const defaultFilename = `imagePrompt-${timestamp}`;
        const filename = defaultFilename + '.json';
        const data = JSON.stringify(filteredPrompts, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                if (Array.isArray(data)) {
                    for (const item of data) {
                        await addImagePrompt({
                            articleId,
                            topic: item.topic || topic,
                            sectionTitle: item.sectionTitle,
                            prompt: item.prompt,
                            createdAt: Date.now(),
                            updatedAt: Date.now()
                        });
                    }
                }
            } catch (err) {
                setError('Failed to restore prompts. Invalid file format.');
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden mb-6">
            <div
                className="flex items-center justify-between p-6 cursor-pointer hover:bg-slate-800/30 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg">
                        <ImageIcon size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Image Generation Prompts</h3>
                        <p className="text-sm text-slate-400">Manage visual storytelling for "{topic}"</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className="bg-slate-800 text-slate-300 text-xs font-medium px-2.5 py-0.5 rounded-full border border-slate-700">
                        {filteredPrompts.length} Prompts
                    </span>
                    {isExpanded ? <ChevronUp className="text-slate-500" /> : <ChevronDown className="text-slate-500" />}
                </div>
            </div>

            {isExpanded && (
                <div className="p-6 pt-0 border-t border-slate-800">
                    {error && (
                        <div className="mt-4 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-start gap-3">
                            <AlertCircle className="shrink-0 mt-0.5" size={18} />
                            <div className="text-sm">{error}</div>
                        </div>
                    )}

                    {/* Quick Generate Bar */}
                    <div className="mt-6 p-4 bg-slate-900/50 border border-slate-800 rounded-xl space-y-4">
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            <Sparkles size={12} className="text-indigo-400" />
                            Quick Custom Generation
                        </div>
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="md:w-2/3 w-full space-y-3">
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={genPromptCustom}
                                        onChange={(e) => setGenPromptCustom(e.target.value)}
                                        placeholder="Enter a custom prompt for this article..."
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-4 pr-4 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all hover:border-slate-700 font-medium"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setShouldGenerateNow(!shouldGenerateNow)}
                                        className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-300 transition-colors cursor-pointer group"
                                    >
                                        <div className={clsx(
                                            "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                            shouldGenerateNow
                                                ? "bg-indigo-500 border-indigo-400 text-white"
                                                : "bg-slate-900 border-slate-700 text-transparent group-hover:border-slate-600"
                                        )}>
                                            <Sparkles size={10} />
                                        </div>
                                        Generate Image Now
                                    </button>
                                </div>
                            </div>
                            <div className="md:w-1/3 w-full flex items-center gap-2 self-start">
                                <div className="relative flex-1">
                                    <select
                                        value={selectedLocation}
                                        onChange={(e) => setSelectedLocation(e.target.value)}
                                        className="w-full appearance-none bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-10 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all cursor-pointer font-medium hover:border-slate-700"
                                    >
                                        <optgroup label="Fixed Locations">
                                            <option value="top">Top of Article</option>
                                            <option value="bottom">Bottom of Article</option>
                                        </optgroup>
                                        {content && (
                                            <optgroup label="Section Headers">
                                                {extractHeaders(content).map((h, idx) => (
                                                    <option key={`${h.text}-${idx}`} value={h.text}>
                                                        {'•'.repeat(h.level)} {h.text}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        )}
                                    </select>
                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                        <Target size={14} />
                                    </div>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                        <ChevronDown size={14} />
                                    </div>
                                </div>
                                <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-1">
                                    <button
                                        onClick={() => setSelectedDirection('above')}
                                        className={clsx(
                                            "p-1.5 rounded transition-all",
                                            selectedDirection === 'above' ? "bg-indigo-500 text-white" : "text-slate-500 hover:text-slate-300"
                                        )}
                                        title="Position Above"
                                    >
                                        <ArrowUp size={14} />
                                    </button>
                                    <button
                                        onClick={() => setSelectedDirection('below')}
                                        className={clsx(
                                            "p-1.5 rounded transition-all",
                                            selectedDirection === 'below' ? "bg-indigo-500 text-white" : "text-slate-500 hover:text-slate-300"
                                        )}
                                        title="Position Below"
                                    >
                                        <ArrowDown size={14} />
                                    </button>
                                </div>
                                <button
                                    onClick={handleQuickGenerate}
                                    disabled={isQuickGenerating || !genPromptCustom.trim()}
                                    className="btn-primary py-2 px-4 shadow-lg shadow-indigo-500/10 flex items-center gap-2 whitespace-nowrap min-w-[124px] justify-center"
                                >
                                    {isQuickGenerating ? <Loader2 size={16} className="animate-spin" /> : (shouldGenerateNow ? <Plus size={16} /> : <Save size={16} />)}
                                    <span>{isQuickGenerating ? 'Generating...' : (shouldGenerateNow ? 'Quick Gen' : 'Save Prompt')}</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 mb-2">
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || !content}
                                className="btn-primary flex items-center gap-2 py-2"
                            >
                                {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                                <span>Generate for All Sections</span>
                            </button>
                            <button
                                onClick={() => setShowConfig(!showConfig)}
                                className={clsx(
                                    "px-4 py-2 rounded-lg transition-colors flex items-center gap-2 border shadow-inner",
                                    showConfig
                                        ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                                        : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                                )}
                            >
                                <Target size={18} />
                                <span>Article Config</span>
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <button onClick={handleBackup} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-slate-800" title="Backup Prompts">
                                <Download size={18} />
                            </button>
                            <label className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-slate-800 cursor-pointer">
                                <Upload size={18} />
                                <input type="file" className="hidden" accept=".json" onChange={handleRestore} />
                            </label>
                            <button
                                onClick={selectAll}
                                className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-white border border-slate-800 rounded-lg hover:bg-slate-800 flex items-center gap-2"
                            >
                                {selectedIds.size === filteredPrompts.length && filteredPrompts.length > 0 ? <CheckSquare size={14} /> : <Square size={14} />}
                                {selectedIds.size === filteredPrompts.length && filteredPrompts.length > 0 ? 'Deselect All' : 'Select All'}
                            </button>
                            {filteredPrompts.length > 0 && (
                                <button
                                    onClick={handleClearAll}
                                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all border border-slate-800"
                                    title="Clear All Prompts"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                    </div>

                    {showConfig && (
                        <PromptConfigModal
                            isOpen={showConfig}
                            onClose={() => setShowConfig(false)}
                            styleOptions={styleOptions}
                            onStyleUpdate={setStyleOptions}
                            customInstructions={customInstructions}
                            onCustomInstructionsUpdate={setCustomInstructions}
                            modelGuidelines={modelGuidelines}
                            onModelGuidelinesUpdate={setModelGuidelines}
                            currentPromptPresetId={selectedPresetId}
                            onPromptPresetChange={handleApplyPreset}
                            layoutConfig={layoutConfig}
                            onLayoutConfigUpdate={setLayoutConfig}
                            activeLayoutPresetId={activeLayoutPresetId}
                            onLayoutPresetChange={handleLayoutPresetChange}
                        />
                    )}

                    {selectedIds.size > 0 && (
                        <div className="mb-6 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-between animate-fade-in shadow-xl">
                            <span className="text-sm text-indigo-300 font-medium">{selectedIds.size} Prompts Selected</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        filteredPrompts.filter(p => selectedIds.has(p.id)).forEach(insertPromptAsQuote);
                                        setSelectedIds(new Set());
                                    }}
                                    className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-lg flex items-center gap-2"
                                >
                                    <Copy size={14} />
                                    Insert Prompts
                                </button>
                                <button
                                    onClick={async () => {
                                        const selected = filteredPrompts.filter(p => selectedIds.has(p.id));
                                        const withExisting = selected.filter(p => !!p.imageUrl);

                                        if (withExisting.length > 0 && !batchChoice) {
                                            showSmartChoiceModal(`${withExisting.length} Prompts`, (choice, applyToAll) => {
                                                if (applyToAll) setBatchChoice(choice);
                                                runBulkGeneration(selected, choice);
                                            });
                                        } else {
                                            runBulkGeneration(selected, batchChoice);
                                        }
                                    }}
                                    disabled={isProcessing}
                                    className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold rounded-lg flex items-center gap-2"
                                >
                                    {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                                    Generate & Insert Images
                                </button>
                                <button
                                    onClick={() => {
                                        setConfirmModal({
                                            message: `Delete ${selectedIds.size} prompts?`,
                                            confirmText: 'Delete',
                                            onConfirm: async () => {
                                                setConfirmModal(null);
                                                for (const id of Array.from(selectedIds)) await deleteImagePrompt(id);
                                                setSelectedIds(new Set());
                                            },
                                            onCancel: () => setConfirmModal(null)
                                        });
                                    }}
                                    className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-bold rounded-lg flex items-center gap-2 border border-red-500/20"
                                >
                                    <Trash2 size={14} />
                                    Delete
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Progress Bar UI */}
                    {generationProgress && (
                        <div className="mb-6 p-4 bg-slate-900/50 border border-slate-700/50 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                    <Loader2 size={12} className="animate-spin" />
                                    {generationProgress.message}
                                </span>
                                <span className="text-[10px] font-bold text-slate-500 uppercase">
                                    {Math.round((generationProgress.current / (generationProgress.total || 1)) * 100)}%
                                </span>
                            </div>
                            <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-500 ease-out"
                                    style={{ width: `${(generationProgress.current / (generationProgress.total || 1)) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}


                    <div className="space-y-4">
                        {filteredPrompts.length === 0 && (
                            <div className="text-center py-16 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
                                <ImageIcon className="mx-auto text-slate-700 mb-4 opacity-50" size={48} />
                                <p className="text-slate-400 font-medium">No image prompts yet.</p>
                                <p className="text-xs text-slate-600 mt-2">Generate prompts from your content using AI.</p>
                            </div>
                        )}

                        {filteredPrompts.map((prompt) => {
                            const isSelected = selectedIds.has(prompt.id);
                            const isProcessingPrompt = processingIds.has(prompt.id);
                            const isHero = prompt.isHero || prompt.sectionTitle.toLowerCase() === 'hero image' || prompt.sectionTitle.toLowerCase() === 'hero';

                            return (
                                <div
                                    key={prompt.id}
                                    className={clsx(
                                        "group relative p-5 rounded-2xl border transition-all cursor-pointer",
                                        editingId === prompt.id ? "bg-indigo-500/5 border-indigo-500/40 font-bold" : isSelected ? "bg-indigo-500/10 border-indigo-500/40 shadow-lg shadow-indigo-500/5" : "bg-slate-800/40 border-slate-800/50 hover:bg-slate-800/60 hover:border-slate-700",
                                        isProcessingPrompt && "opacity-75 blur-[0.5px]"
                                    )}
                                    onClick={() => !editingId && toggleSelect(prompt.id)}
                                >
                                    {editingId === prompt.id ? (
                                        <div className="space-y-4" onClick={e => e.stopPropagation()}>
                                            <div className="flex justify-between items-center bg-slate-950/50 p-2 rounded-xl border border-slate-700">
                                                <input
                                                    type="text"
                                                    value={editTitle}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setEditTitle(val);
                                                        if (val.toLowerCase().includes('hero')) setEditIsHero(true);
                                                    }}
                                                    className="bg-transparent text-sm text-white w-full outline-none px-2"
                                                />
                                                <div className="flex gap-1">
                                                    <button onClick={() => handleSaveEdit(prompt.id)} className="p-2 text-emerald-400 hover:bg-emerald-400/10 rounded-lg"><Save size={18} /></button>
                                                    <button onClick={() => setEditingId(null)} className="p-2 text-slate-400 hover:bg-slate-400/10 rounded-lg"><X size={18} /></button>
                                                </div>
                                            </div>
                                            <textarea value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} rows={3} className="w-full bg-slate-950/50 border border-slate-700 rounded-xl p-3 text-sm text-slate-300 resize-none outline-none focus:ring-1 focus:ring-indigo-500/30" />
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => setEditIsHero(!editIsHero)}
                                                    className={clsx(
                                                        "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[10px] font-black uppercase tracking-widest",
                                                        editIsHero ? "bg-amber-500/20 border-amber-500 text-amber-500" : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700"
                                                    )}
                                                >
                                                    <Star size={12} fill={editIsHero ? "currentColor" : "none"} />
                                                    Hero Mark
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex gap-4">
                                            {/* Thumbnail Section */}
                                            <div className="shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-slate-700/50 bg-slate-900 flex items-center justify-center shadow-inner group-hover:border-slate-600 transition-colors">
                                                {prompt.imageUrl ? (
                                                    <img src={prompt.imageUrl} alt={prompt.sectionTitle} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
                                                ) : (
                                                    <div className="flex flex-col items-center gap-1 opacity-20 group-hover:opacity-40 transition-opacity">
                                                        <ImageIcon size={24} className="text-slate-400" />
                                                        <span className="text-[8px] font-black uppercase tracking-tighter text-slate-500">Unset</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-4">
                                                        <div className={clsx("p-1.5 rounded-lg border transition-all shadow-sm", isSelected ? "bg-indigo-500 border-indigo-400 text-white" : "bg-slate-900 border-slate-700 text-slate-800")}>
                                                            <CheckSquare size={16} />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                                                                {prompt.sectionTitle}
                                                                {isHero && <span className="flex items-center gap-1 text-[9px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-tighter"><Star size={8} className="fill-current" /> Hero</span>}
                                                                {(prompt.version || 1) > 1 && <span className="text-[9px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full border border-slate-600 font-bold uppercase tracking-tighter">v{prompt.version}</span>}
                                                                {prompt.isPromptInserted && <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold uppercase tracking-tighter">P-Inserted</span>}
                                                                {prompt.isImageInserted && <span className="text-[9px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/20 font-bold uppercase tracking-tighter">I-Inserted</span>}
                                                            </h4>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                        <button onClick={() => handleStartEdit(prompt)} className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                                        <button onClick={() => insertPromptAsQuote(prompt)} className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors" title="Insert Prompt"><Copy size={16} /></button>
                                                        {onJumpToSection && <button onClick={() => onJumpToSection(prompt.sectionTitle)} className="p-2 text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition-colors" title="Jump to Section"><Target size={16} /></button>}
                                                        <button
                                                            onClick={async () => {
                                                                if (prompt.imageUrl) {
                                                                    showSmartChoiceModal(prompt.sectionTitle, async (choice) => {
                                                                        const updatedContent = await generateAndInsertImage(
                                                                            prompt,
                                                                            content,
                                                                            true,
                                                                            choice === 'use-existing' ? prompt.imageUrl : undefined
                                                                        );
                                                                        if (updatedContent) onUpdateContent(updatedContent);
                                                                    });
                                                                } else {
                                                                    const updatedContent = await generateAndInsertImage(prompt, content, true);
                                                                    if (updatedContent) onUpdateContent(updatedContent);
                                                                }
                                                            }}
                                                            disabled={isProcessingPrompt}
                                                            className="p-2 text-slate-400 hover:text-purple-400 hover:bg-purple-400/10 rounded-lg transition-colors disabled:opacity-50"
                                                            title="Generate Image"
                                                        >
                                                            {isProcessingPrompt ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
                                                        </button>
                                                        <button onClick={() => handleDelete(prompt.id)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors" title="Delete"><Trash2 size={16} /></button>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                                    <div className="relative">
                                                        <select
                                                            value={activeLayoutPresetId || ''}
                                                            onChange={(e) => handleLayoutPresetChange(e.target.value === 'custom' ? null : e.target.value)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="appearance-none bg-slate-900 border border-slate-700/50 rounded-lg pl-8 pr-8 py-1 text-[10px] font-bold text-slate-400 hover:text-indigo-300 hover:border-indigo-500/30 transition-all outline-none"
                                                        >
                                                            <option value="" disabled>Select Layout</option>
                                                            {(settings.layoutPresets || []).map(p => (
                                                                <option key={p.id} value={p.id}>{p.name}</option>
                                                            ))}
                                                            <option value="custom">Custom</option>
                                                        </select>
                                                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                                            <LayoutTemplate size={12} />
                                                        </div>
                                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                                            <ChevronDown size={10} />
                                                        </div>
                                                    </div>

                                                    <div className="relative">
                                                        <select
                                                            value={prompt.presetId || ''}
                                                            onChange={(e) => handleUpdatePresetForPrompt(prompt.id, e.target.value)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="appearance-none bg-slate-900 border border-slate-700/50 rounded-lg pl-8 pr-8 py-1 text-[10px] font-bold text-slate-400 hover:text-indigo-300 hover:border-indigo-500/30 transition-all outline-none"
                                                        >
                                                            <option value="">No Style Preset</option>
                                                            <optgroup label="Standard Styles">
                                                                {STANDARD_PRESETS.map(p => (
                                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                                ))}
                                                            </optgroup>
                                                            {(settings.promptPresets || []).length > 0 && (
                                                                <optgroup label="My Presets">
                                                                    {(settings.promptPresets || []).map(p => (
                                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                                    ))}
                                                                </optgroup>
                                                            )}
                                                        </select>
                                                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                                            <Sparkles size={12} />
                                                        </div>
                                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                                            <ChevronDown size={10} />
                                                        </div>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-slate-400 leading-relaxed italic border-l-2 border-slate-700/50 pl-4 py-1">"{prompt.prompt}"</p>
                                                {isHero && prompt.heroReasoning && (
                                                    <div className="mt-3 bg-amber-500/5 border border-amber-500/10 rounded-lg p-3">
                                                        <p className="text-[9px] font-black text-amber-500/50 uppercase tracking-widest mb-1 flex items-center gap-1">
                                                            <Sparkles size={10} />
                                                            Hero Gestalt Reasoning
                                                        </p>
                                                        <p className="text-xs text-amber-200/70 leading-relaxed italic">
                                                            {prompt.heroReasoning}
                                                        </p>
                                                    </div>
                                                )}
                                                {(prompt.version || 1) > 1 && (
                                                    <div className="mt-2 flex items-center gap-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setViewingHistoryTitle(prompt.sectionTitle);
                                                            }}
                                                            className="text-[9px] font-black text-slate-500 hover:text-indigo-400 uppercase tracking-widest flex items-center gap-1 transition-colors"
                                                        >
                                                            <Copy size={10} />
                                                            View Version History
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {viewingHistoryTitle && (
                <ConfirmModal
                    message={
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                            <div className="flex items-center gap-2 text-indigo-400 mb-4">
                                <Copy size={18} />
                                <h4 className="font-bold text-white">Version History: {viewingHistoryTitle}</h4>
                            </div>
                            {allPrompts
                                .filter(p => p.sectionTitle === viewingHistoryTitle)
                                .sort((a, b) => (b.version || 1) - (a.version || 1))
                                .map((version, i) => (
                                    <div
                                        key={version.id}
                                        className={clsx(
                                            "p-4 rounded-xl border transition-all",
                                            i === 0 ? "bg-indigo-500/10 border-indigo-500/30" : "bg-slate-800/50 border-slate-700 hover:bg-slate-800"
                                        )}
                                    >
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                                Version {version.version || 1} {i === 0 && <span className="text-indigo-400 ml-2">(Latest)</span>}
                                            </span>
                                            <span className="text-[10px] text-slate-600">{format(version.createdAt, 'MMM d, h:mm a')}</span>
                                        </div>
                                        <p className="text-sm text-slate-300 italic mb-3">"{version.prompt}"</p>
                                        {i > 0 && (
                                            <button
                                                onClick={async () => {
                                                    // To 'restore', we create a new version with the old content
                                                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                                    const { id: _, ...rest } = version;
                                                    const restoredPrompt: Omit<ImagePrompt, 'id'> = {
                                                        ...rest,
                                                        version: (allPrompts.find(p => p.sectionTitle === viewingHistoryTitle)?.version || 1) + 1,
                                                        previousVersionId: version.id,
                                                        createdAt: Date.now(),
                                                        updatedAt: Date.now()
                                                    };
                                                    await addImagePrompt(restoredPrompt);
                                                    setViewingHistoryTitle(null);
                                                }}
                                                className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-widest flex items-center gap-1"
                                            >
                                                <RotateCcw size={10} />
                                                Restore this version
                                            </button>
                                        )}
                                    </div>
                                ))}
                        </div>
                    }
                    onConfirm={() => setViewingHistoryTitle(null)}
                    confirmText="Done"
                    showCancel={false}
                />
            )}

            {confirmModal && (
                <ConfirmModal
                    message={confirmModal.message}
                    onConfirm={confirmModal.onConfirm}
                    onCancel={confirmModal.onCancel}
                    confirmText={confirmModal.confirmText}
                    cancelText={confirmModal.cancelText}
                    showCancel={confirmModal.showCancel}
                />
            )}
        </div>
    );
};

export default ImagePromptManager;
