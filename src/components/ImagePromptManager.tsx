import { useState, useEffect } from 'react';
import {
    Sparkles,
    Plus,
    Trash2,
    Edit2,
    Save,
    X,
    ChevronDown,
    ChevronUp,
    Image as ImageIcon,
    Loader2,
    AlertCircle,
    Copy,
    Download,
    Upload,
    CheckSquare,
    Square,
    Check,
    Star,
    Target
} from 'lucide-react';
import { useStore } from '../store';
import { generateImagePrompts, generateImage } from '../services/aiService';
import type { ImagePrompt } from '../types';
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
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(true);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
    const [isProcessing, setIsProcessing] = useState(false); // Used for batch actions

    // Form states
    const [newTitle, setNewTitle] = useState('');
    const [newPrompt, setNewPrompt] = useState('');
    const [editTitle, setEditTitle] = useState('');
    const [editPrompt, setEditPrompt] = useState('');

    useEffect(() => {
        loadImagePrompts(articleId);
    }, [articleId]);

    const filteredPrompts = imagePrompts
        .filter(p => p.articleId === articleId)
        .sort((a, b) => {
            // Requirement: Hero/Intro first, others in order.
            // Since AI returns them in order, we should probably rely on a 'position' or just createdAt if added sequentially.
            // For now, let's assume they are added in order.
            return a.createdAt - b.createdAt;
        });

    const handleGenerate = async () => {
        if (filteredPrompts.length > 0) {
            if (!window.confirm('A set of image prompts already exists for this article. Do you want to overwrite them?')) {
                return;
            }
            // Clear existing for this article before generating new ones
            for (const p of filteredPrompts) {
                await deleteImagePrompt(p.id);
            }
        }

        setIsGenerating(true);
        setError(null);
        try {
            const { prompts: aiPrompts, error: aiError } = await generateImagePrompts(content, settings);
            if (aiError) {
                setError(aiError);
            } else {
                // Add prompts sequentially to maintain order via createdAt
                for (let i = 0; i < aiPrompts.length; i++) {
                    const draft = aiPrompts[i];
                    await addImagePrompt({
                        articleId,
                        topic,
                        sectionTitle: draft.sectionTitle,
                        prompt: draft.prompt,
                        createdAt: Date.now() + i, // Offset to ensure predictable order
                        updatedAt: Date.now() + i
                    });
                }
            }
        } catch (err) {
            setError('Failed to generate prompts. Please check your AI settings.');
            console.error(err);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAddManual = async () => {
        if (!newTitle || !newPrompt) return;
        try {
            await addImagePrompt({
                articleId,
                topic,
                sectionTitle: newTitle,
                prompt: newPrompt,
                createdAt: Date.now(),
                updatedAt: Date.now()
            });
            setNewTitle('');
            setNewPrompt('');
            setIsAdding(false);
        } catch (err) {
            setError('Failed to add prompt.');
        }
    };

    const handleStartEdit = (prompt: ImagePrompt) => {
        setEditingId(prompt.id);
        setEditTitle(prompt.sectionTitle);
        setEditPrompt(prompt.prompt);
    };

    const handleSaveEdit = async (id: string) => {
        try {
            await updateImagePrompt(id, {
                sectionTitle: editTitle,
                prompt: editPrompt
            });
            setEditingId(null);
        } catch (err) {
            setError('Failed to update prompt.');
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this prompt?')) {
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
        }
    };

    const handleClearAll = async () => {
        if (window.confirm('Are you sure you want to delete ALL prompts for this article?')) {
            try {
                for (const p of filteredPrompts) {
                    await deleteImagePrompt(p.id);
                }
                setSelectedIds(new Set());
            } catch (err) {
                setError('Failed to clear all prompts.');
            }
        }
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

    const findHeaderIndex = (sectionTitle: string, articleContent: string): number => {
        const escapeRegExp = (string: string) => {
            return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        };

        const lowerTitle = sectionTitle.toLowerCase();

        // Specific Hero Image handling: should go at the very top (gestalt)
        if (lowerTitle === 'hero image' || lowerTitle === 'hero') return 0;

        const escapedTitle = escapeRegExp(sectionTitle);

        // 1. Try exact header match (case insensitive)
        const exactRegex = new RegExp(`^#+\\s+${escapedTitle}\\s*$`, 'im');
        const exactMatch = articleContent.match(exactRegex);
        if (exactMatch && exactMatch.index !== undefined) return exactMatch.index;

        // 2. Try partial header match (header contains title)
        const partialRegex = new RegExp(`^#+\\s+.*${escapedTitle}.*`, 'im');
        const partialMatch = articleContent.match(partialRegex);
        if (partialMatch && partialMatch.index !== undefined) return partialMatch.index;

        // 3. Fuzzy match: sanitize both and check inclusion
        const sanitize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
        const sanitizedTitle = sanitize(sectionTitle);

        const lines = articleContent.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('#')) {
                const sanitizedLine = sanitize(line.replace(/^#+\s+/, ''));
                if (sanitizedLine.includes(sanitizedTitle) || sanitizedTitle.includes(sanitizedLine)) {
                    // Find the index of this line in the original content
                    let currentPos = 0;
                    for (let j = 0; j < i; j++) {
                        currentPos += lines[j].length + 1; // +1 for newline
                    }
                    return currentPos;
                }
            }
        }

        return -1;
    };

    const insertPromptAsQuote = async (prompt: ImagePrompt) => {
        const headerIndex = findHeaderIndex(prompt.sectionTitle, content);
        const quote = `\n> **AI Image Prompt:** ${prompt.prompt}\n\n`;

        const isIntro = prompt.sectionTitle.toLowerCase().includes('introduction') ||
            prompt.sectionTitle.toLowerCase() === 'intro';

        let newContent = content;
        if (headerIndex !== -1) {
            newContent = content.slice(0, headerIndex) + quote + content.slice(headerIndex);
        } else if (isIntro) {
            newContent = quote + content;
        } else {
            newContent = content + quote;
        }

        onUpdateContent(newContent);
        await updateImagePrompt(prompt.id, { isPromptInserted: true });
    };

    const generateAndInsertImage = async (prompt: ImagePrompt) => {
        setProcessingIds(prev => new Set(prev).add(prompt.id));
        setError(null);
        try {
            const result = await generateImage(prompt.prompt, settings);

            if (result.error) {
                setError(result.error);
                return;
            }

            if (result.imageUrl) {
                // Compress image to ensure it fits in Firestore (< 1MB)
                const compressedUrl = await compressImage(result.imageUrl, 700 * 1024, 1024, 0.7);

                // Add to Media Collection
                await addMedia({
                    name: `Section-${prompt.sectionTitle.replace(/\s+/g, '-')}-${Date.now()}.jpg`,
                    type: 'image/jpeg',
                    url: compressedUrl,
                    createdAt: Date.now(),
                    size: Math.round((compressedUrl.length * 3) / 4)
                });

                // Check for Hero Fallback
                const article = articles.find(a => a.id === articleId);
                const hasHero = article?.heroImage && article.heroImage.trim() !== '' && article.heroImage !== 'null';

                if (!hasHero) {
                    await updateArticle(articleId, { heroImage: compressedUrl });
                }

                // Insert into Markdown
                const headerIndex = findHeaderIndex(prompt.sectionTitle, content);
                const imageMarkdown = `\n![${prompt.sectionTitle}](${compressedUrl})\n\n`;

                const isIntro = prompt.sectionTitle.toLowerCase().includes('introduction') ||
                    prompt.sectionTitle.toLowerCase() === 'intro';

                let newContent = content;
                if (headerIndex !== -1) {
                    newContent = content.slice(0, headerIndex) + imageMarkdown + content.slice(headerIndex);
                } else if (isIntro) {
                    newContent = imageMarkdown + content;
                } else {
                    newContent = content + imageMarkdown;
                }

                onUpdateContent(newContent);
                await updateImagePrompt(prompt.id, { isImageInserted: true });
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            setError(`Failed to generate image with NanoBanana: ${msg}`);
            console.error(err);
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
        const userInput = window.prompt('Enter filename for backup (without .json):', defaultFilename);

        if (userInput === null) return; // Cancelled

        const filename = (userInput.trim() || defaultFilename) + '.json';
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
                        // Create new entries (ignoring old IDs to avoid conflicts if restoring to different article, 
                        // though here we link to current articleId)
                        await addImagePrompt({
                            articleId,
                            topic: item.topic || topic, // Prefer imported topic, fallback to current
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

                    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 mb-6">
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
                                onClick={() => setIsAdding(true)}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors flex items-center gap-2 border border-slate-700"
                            >
                                <Plus size={18} />
                                <span>Add Manual</span>
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleBackup}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-slate-800"
                                title="Backup Prompts"
                            >
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
                                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-slate-800"
                                    title="Clear All Prompts"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                    </div>

                    {selectedIds.size > 0 && (
                        <div className="mb-6 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-between animate-fade-in">
                            <span className="text-sm text-indigo-300 font-medium">
                                {selectedIds.size} Prompts Selected
                            </span>
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
                                        setIsProcessing(true);
                                        const selected = filteredPrompts.filter(p => selectedIds.has(p.id));
                                        for (const p of selected) {
                                            await generateAndInsertImage(p);
                                        }
                                        setIsProcessing(false);
                                        setSelectedIds(new Set());
                                    }}
                                    disabled={isProcessing}
                                    className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold rounded-lg flex items-center gap-2"
                                >
                                    {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                                    Generate & Insert Images
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirm(`Delete ${selectedIds.size} prompts?`)) {
                                            selectedIds.forEach(id => deleteImagePrompt(id));
                                            setSelectedIds(new Set());
                                        }
                                    }}
                                    className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-bold rounded-lg flex items-center gap-2 border border-red-500/20"
                                >
                                    <Trash2 size={14} />
                                    Delete
                                </button>
                            </div>
                        </div>
                    )}

                    {isAdding && (
                        <div className="mb-6 p-4 bg-slate-800/50 border border-slate-700 rounded-xl animate-fade-in">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-sm font-semibold text-slate-200">New Image Prompt</h4>
                                <button onClick={() => setIsAdding(false)} className="text-slate-500 hover:text-white">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Section Title</label>
                                    <input
                                        type="text"
                                        value={newTitle}
                                        onChange={(e) => setNewTitle(e.target.value)}
                                        placeholder="e.g. Introduction, The Future of AI..."
                                        className="input-field py-1.5"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">NanoBanana Prompt</label>
                                    <textarea
                                        value={newPrompt}
                                        onChange={(e) => setNewPrompt(e.target.value)}
                                        placeholder="Enter the descriptive image prompt..."
                                        rows={3}
                                        className="input-field resize-none py-2"
                                    />
                                </div>
                                <button
                                    onClick={handleAddManual}
                                    disabled={!newTitle || !newPrompt}
                                    className="w-full btn-primary py-2 text-sm"
                                >
                                    Save Prompt
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        {filteredPrompts.length === 0 && !isAdding && (
                            <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/30">
                                <ImageIcon className="mx-auto text-slate-700 mb-3" size={32} />
                                <p className="text-slate-500">No image prompts generated yet.</p>
                                <p className="text-xs text-slate-600 mt-1">Use the AI to analyze your post and suggest images.</p>
                            </div>
                        )}

                        {filteredPrompts.map((prompt) => {
                            const isSelected = selectedIds.has(prompt.id);
                            const isProcessingPrompt = processingIds.has(prompt.id);
                            const isHero = prompt.sectionTitle.toLowerCase() === 'hero image' ||
                                prompt.sectionTitle.toLowerCase() === 'hero';

                            return (
                                <div
                                    key={prompt.id}
                                    className={clsx(
                                        "group relative p-4 rounded-xl border transition-all cursor-pointer",
                                        editingId === prompt.id
                                            ? "bg-indigo-500/5 border-indigo-500/30 font-bold"
                                            : isSelected
                                                ? "bg-indigo-500/10 border-indigo-500/40 shadow-lg shadow-indigo-500/5"
                                                : "bg-slate-800/30 border-slate-800 hover:border-slate-700",
                                        isProcessingPrompt && "opacity-75"
                                    )}
                                    onClick={() => !editingId && toggleSelect(prompt.id)}
                                >
                                    {editingId === prompt.id ? (
                                        <div className="space-y-4" onClick={e => e.stopPropagation()}>
                                            <div className="flex justify-between items-center">
                                                <input
                                                    type="text"
                                                    value={editTitle}
                                                    onChange={(e) => setEditTitle(e.target.value)}
                                                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white w-full mr-4"
                                                />
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleSaveEdit(prompt.id)} className="p-1 text-emerald-400 hover:bg-emerald-400/10 rounded">
                                                        <Save size={18} />
                                                    </button>
                                                    <button onClick={() => setEditingId(null)} className="p-1 text-slate-400 hover:bg-slate-400/10 rounded">
                                                        <X size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                            <textarea
                                                value={editPrompt}
                                                onChange={(e) => setEditPrompt(e.target.value)}
                                                rows={2}
                                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-300 resize-none"
                                            />
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className={clsx(
                                                        "p-1 rounded-md border transition-colors",
                                                        isSelected ? "bg-indigo-500 border-indigo-400 text-white" : "bg-slate-900 border-slate-700 text-slate-700"
                                                    )}>
                                                        <CheckSquare size={14} />
                                                    </div>
                                                    <div className="flex flex-col gap-0.5">
                                                        <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                                                            {prompt.sectionTitle}
                                                            {isHero && (
                                                                <span className="flex items-center gap-0.5 text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20 font-bold uppercase tracking-wider">
                                                                    <Star size={10} className="fill-current" /> Hero
                                                                </span>
                                                            )}
                                                            {prompt.isPromptInserted && (
                                                                <span className="flex items-center gap-0.5 text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 leading-none">
                                                                    <Check size={10} /> Prompt
                                                                </span>
                                                            )}
                                                            {prompt.isImageInserted && (
                                                                <span className="flex items-center gap-0.5 text-[10px] bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/20 leading-none">
                                                                    <Check size={10} /> Image
                                                                </span>
                                                            )}
                                                        </h4>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => handleStartEdit(prompt)}
                                                        className="p-1 text-slate-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => insertPromptAsQuote(prompt)}
                                                        className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded transition-colors"
                                                        title="Insert as Prompt"
                                                    >
                                                        <Copy size={16} />
                                                    </button>
                                                    {onJumpToSection && (
                                                        <button
                                                            onClick={() => onJumpToSection(prompt.sectionTitle)}
                                                            className="p-1 text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 rounded transition-colors"
                                                            title="Jump to Section"
                                                        >
                                                            <Target size={16} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => generateAndInsertImage(prompt)}
                                                        disabled={isProcessingPrompt}
                                                        className="p-1 text-slate-400 hover:text-purple-400 hover:bg-purple-400/10 rounded transition-colors disabled:opacity-50"
                                                        title="Generate & Insert Image"
                                                    >
                                                        {isProcessingPrompt ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(prompt.id)}
                                                        className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-sm text-slate-400 leading-relaxed italic border-l-2 border-slate-700 pl-3">
                                                "{prompt.prompt}"
                                            </p>
                                        </>
                                    )}
                                </div >
                            );
                        })}
                    </div >
                </div >
            )}
        </div >
    );
};

export default ImagePromptManager;
