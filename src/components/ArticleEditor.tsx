import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { generateWithResearch } from '../services/aiService';
import MarkdownRenderer from './MarkdownRenderer';
import {
    ArrowLeft,
    Save,
    Eye,
    RefreshCw,
    Clock,
    FileText,
    ChevronDown,
    Sparkles,
    Send,
    Database
} from 'lucide-react';
import ImagePromptManager from './ImagePromptManager';
import { format } from 'date-fns';
import ResearchSelector from './ResearchSelector';
import type { Article, ArticleVersion, PerplexityPrompt, MediaItem } from '../types';
import { Trash2, MoveUp, MoveDown, Image as ImageIcon } from 'lucide-react';
import MediaSelectorModal from './MediaSelectorModal';
import ConfirmModal from './ConfirmModal';

interface Block {
    id: string;
    type: 'text' | 'image';
    content?: string;
    alt?: string;
    url?: string;
}

interface ArticleEditorProps {
    article: Article;
}

const ArticleEditor = ({ article }: ArticleEditorProps) => {
    const navigate = useNavigate();
    const {
        settings,
        addArticleVersion,
        updateArticle,
        addPost,
        perplexityPrompts,
        getResearchByTopic,
        addResearch,
        updateArticleVersion,
        syncHeroImages
    } = useStore();

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isVersionHistoryCollapsed, setIsVersionHistoryCollapsed] = useState(true);

    const [currentVersionId, setCurrentVersionId] = useState(article.currentVersionId);
    const [showPreview, setShowPreview] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [showResearchSelector, setShowResearchSelector] = useState(false);
    const [showMediaSelector, setShowMediaSelector] = useState(false);
    const [existingResearch, setExistingResearch] = useState<PerplexityPrompt[]>([]);
    const [scheduleDate, setScheduleDate] = useState(
        article.scheduleDate ? new Date(article.scheduleDate).toISOString().slice(0, 16) : ''
    );
    const [confirmModal, setConfirmModal] = useState<{
        message: string | React.ReactNode;
        onConfirm: () => void;
        onCancel?: () => void;
        confirmText?: string;
        cancelText?: string;
        showCancel?: boolean;
    } | null>(null);

    // Track active text block and cursor position for media insertion
    const activeBlockRef = useRef<{ id: string; start: number; end: number } | null>(null);

    const currentVersion = article.versions.find(v => v.id === article.currentVersionId);

    if (!currentVersion) {
        return <div className="text-center py-12 text-slate-400">Version not found</div>;
    }
    const sortedVersions = [...article.versions].sort((a, b) => b.createdAt - a.createdAt);

    // Local state for content to ensure smooth typing
    const [localContent, setLocalContent] = useState(currentVersion?.content || '');
    const [blocks, setBlocks] = useState<Block[]>([]);
    const saveTimeoutRef = useRef<any>(null);

    // Helpers for block conversion
    const parseMarkdownToBlocks = (markdown: string): Block[] => {
        // Updated regex to catch BOTH images and headers
        // Headers must be at the start of a line
        const regex = /(!\[[^\]]*\]\([^)]+\))|(^#+\s+.*$)/gm;
        let lastIndex = 0;
        const newBlocks: Block[] = [];
        let match;

        while ((match = regex.exec(markdown)) !== null) {
            // Text block before the match
            if (match.index > lastIndex) {
                const text = markdown.slice(lastIndex, match.index);
                // Trim to avoid accumulating empty whitespace blocks
                const trimmedText = text.trim();
                if (trimmedText.length > 0) {
                    newBlocks.push({
                        id: `text-${Math.random().toString(36).substr(2, 9)}`,
                        type: 'text',
                        content: trimmedText
                    });
                }
            }

            // Determine if it was an image or a header
            const matchedText = match[0];
            if (matchedText.startsWith('![')) {
                // Image block
                const imgMatch = /!\[([^\]]*)\]\(([^)]+)\)/.exec(matchedText);
                if (imgMatch) {
                    newBlocks.push({
                        id: `img-${Math.random().toString(36).substr(2, 9)}`,
                        type: 'image',
                        alt: imgMatch[1],
                        url: imgMatch[2]
                    });
                }
            } else {
                // Header - keep as text block but it starts here
                newBlocks.push({
                    id: `text-${Math.random().toString(36).substr(2, 9)}`,
                    type: 'text',
                    content: matchedText.trim()
                });
            }
            lastIndex = regex.lastIndex;
        }

        // Final text block
        if (lastIndex < markdown.length) {
            const remaining = markdown.slice(lastIndex);
            const trimmedRemaining = remaining.trim();
            if (trimmedRemaining.length > 0) {
                newBlocks.push({
                    id: `text-${Math.random().toString(36).substr(2, 9)}`,
                    type: 'text',
                    content: trimmedRemaining
                });
            }
        }

        // Ensure at least one text block if empty
        if (newBlocks.length === 0) {
            newBlocks.push({
                id: `text-${Math.random().toString(36).substr(2, 9)}`,
                type: 'text',
                content: ''
            });
        }

        return newBlocks;
    };

    const serializeBlocksToMarkdown = (blockArray: Block[]): string => {
        // Joining with double newlines ensures blocks are treated as separate paragraphs/entities
        return blockArray
            .map(b => (b.type === 'text' ? (b.content || '').trim() : `![${b.alt || ''}](${b.url || ''})`))
            .filter(content => content.length > 0)
            .join('\n\n');
    };

    // Sync local content and blocks when version changes
    useEffect(() => {
        if (currentVersion) {
            setLocalContent(currentVersion.content);
            setBlocks(parseMarkdownToBlocks(currentVersion.content));
        }
    }, [currentVersionId, article.versions]);

    // Get research info for current version
    const currentResearch = currentVersion?.researchId
        ? perplexityPrompts.find(r => r.id === currentVersion.researchId)
        : null;

    const handleVersionChange = (versionId: string) => {
        setCurrentVersionId(versionId);
        updateArticle(article.id, { currentVersionId: versionId });
    };

    const handleRegenerateClick = () => {
        // Check for existing research
        const existing = getResearchByTopic(article.topic);

        if (existing.length > 0) {
            setExistingResearch(existing);
            setShowResearchSelector(true);
        } else {
            handleRegenerate(null);
        }
    };

    const handleResearchSelection = (research: PerplexityPrompt | null) => {
        setShowResearchSelector(false);
        handleRegenerate(research);
    };

    const handleRegenerate = async (research: PerplexityPrompt | null) => {
        if (!research) {
            setConfirmModal({
                message: 'Generate a new version of this article? This will use your Perplexity API credits.',
                onConfirm: () => {
                    setConfirmModal(null);
                    performRegenerate(research);
                },
                onCancel: () => setConfirmModal(null)
            });
            return;
        }
        performRegenerate(research);
    };

    const performRegenerate = async (research: PerplexityPrompt | null) => {
        setIsRegenerating(true);
        try {
            const cachedResearch = research ? {
                prompt: research.prompt,
                response: research.response
            } : undefined;

            const result = await generateWithResearch(article.topic, settings, cachedResearch);

            if (result.error) {
                setConfirmModal({
                    message: `Error: ${result.error}`,
                    onConfirm: () => setConfirmModal(null),
                    showCancel: false
                });
                return;
            }

            if (result.content) {
                // Save research if it's new
                let researchId = research?.id;
                if (!research && result.researchPrompt && result.researchResponse) {
                    researchId = await addResearch({
                        prompt: result.researchPrompt,
                        response: result.researchResponse,
                        topic: article.topic,
                        revisionId: 1,
                        createdAt: Date.now()
                    });
                }

                const newVersionId = `v${Date.now()}`;
                const newVersion: ArticleVersion = {
                    id: newVersionId,
                    content: result.content,
                    title: `Article about ${article.topic}`,
                    createdAt: Date.now(),
                    generatedBy: 'ai',
                    researchId: researchId
                };

                await addArticleVersion(article.id, newVersion);
                setCurrentVersionId(newVersionId);
                setConfirmModal({
                    message: 'New version generated successfully!',
                    onConfirm: () => setConfirmModal(null),
                    showCancel: false
                });
            }
        } catch (error) {
            setConfirmModal({
                message: 'Failed to generate new version. Please try again.',
                onConfirm: () => setConfirmModal(null),
                showCancel: false
            });
        } finally {
            setIsRegenerating(false);
        }
    };

    const handlePublish = async () => {
        if (!currentVersion) return;

        try {
            await addPost({
                title: currentVersion.title || `Article: ${article.topic}`,
                content: currentVersion.content,
                status: 'draft',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                tags: ['blog', article.topic],
                attachments: [],
            });

            setConfirmModal({
                message: 'Article published to Posts as draft!',
                onConfirm: () => {
                    setConfirmModal(null);
                    navigate('/posts');
                },
                showCancel: false
            });
        } catch (error) {
            setConfirmModal({
                message: 'Failed to publish article. Please try again.',
                onConfirm: () => setConfirmModal(null),
                showCancel: false
            });
        }
    };

    const handleSaveSchedule = async () => {
        const updates: Partial<Article> = {
            scheduleDate: scheduleDate ? new Date(scheduleDate).getTime() : undefined,
            status: scheduleDate ? 'scheduled' : 'draft'
        };
        await updateArticle(article.id, updates);
        setConfirmModal({
            message: 'Schedule updated!',
            onConfirm: () => setConfirmModal(null),
            showCancel: false
        });
    };

    const handleUpdateContent = (newContent: string) => {
        setLocalContent(newContent);
        // Also update blocks if this came from outside (like image insertion)
        setBlocks(parseMarkdownToBlocks(newContent));

        // Debounce store update
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
            if (currentVersion) {
                try {
                    await updateArticleVersion(article.id, currentVersion.id, { content: newContent });
                } catch (error) {
                    console.error('Failed to auto-save:', error);
                }
            }
        }, 1000);
    };

    const updateBlockContent = (id: string, content: string) => {
        const newBlocks = blocks.map(b => b.id === id ? { ...b, content } : b);
        setBlocks(newBlocks);
        const newMarkdown = serializeBlocksToMarkdown(newBlocks);
        setLocalContent(newMarkdown);

        // Debounce store update
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
            if (currentVersion) {
                try {
                    await updateArticleVersion(article.id, currentVersion.id, { content: newMarkdown });
                } catch (error) {
                    console.error('Failed to auto-save:', error);
                }
            }
        }, 1000);
    };

    const deleteBlock = (id: string) => {
        const newBlocks = blocks.filter(b => b.id !== id);
        // Ensure at least one text block
        if (newBlocks.length === 0 || !newBlocks.some(b => b.type === 'text')) {
            newBlocks.push({ id: `text-${Date.now()}`, type: 'text', content: '' });
        }
        setBlocks(newBlocks);
        handleUpdateContent(serializeBlocksToMarkdown(newBlocks));
    };

    const moveBlock = (index: number, direction: 'up' | 'down') => {
        const newBlocks = [...blocks];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex >= 0 && targetIndex < newBlocks.length) {
            [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
            setBlocks(newBlocks);
            handleUpdateContent(serializeBlocksToMarkdown(newBlocks));
        }
    };

    const handleSyncHero = async () => {
        setIsRefreshing(true);
        try {
            await syncHeroImages([article.id], true); // Force sync for individual article
            setConfirmModal({
                message: 'Hero image synced from content!',
                onConfirm: () => setConfirmModal(null),
                showCancel: false
            });
        } catch (error) {
            console.error('Sync hero failed:', error);
            setConfirmModal({
                message: 'Failed to sync hero image.',
                onConfirm: () => setConfirmModal(null),
                showCancel: false
            });
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleJumpToSection = (sectionTitle: string) => {
        const lowerTitle = sectionTitle.toLowerCase();
        console.log(`[JumpToSection] Target: "${sectionTitle}"`);

        let targetBlockId = '';

        // Special case for Hero Image -> top of article
        if (lowerTitle === 'hero image' || lowerTitle === 'hero') {
            targetBlockId = blocks[0]?.id;
        } else {
            // Find the block that looks like this section header
            const sanitize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
            const sanitizedTarget = sanitize(sectionTitle);

            for (const block of blocks) {
                if (block.type === 'text' && block.content) {
                    const contentLead = block.content.trim().split('\n')[0];
                    if (contentLead.startsWith('#')) {
                        const sanitizedLead = sanitize(contentLead.replace(/^#+\s+/, ''));
                        if (sanitizedLead.includes(sanitizedTarget) || sanitizedTarget.includes(sanitizedLead)) {
                            targetBlockId = block.id;
                            break;
                        }
                    }
                }
            }
        }

        console.log(`[JumpToSection] Target Block ID: ${targetBlockId}`);

        // 3. Scroll to the block
        if (targetBlockId) {
            const element = document.querySelector(`[data-block-id="${targetBlockId}"]`);
            if (element) {
                console.log(`[JumpToSection] Found element, scrolling...`);
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Visual feedback: brief highlight
                const htmlEl = element as HTMLElement;
                const originalBg = htmlEl.style.backgroundColor;
                const originalTransition = htmlEl.style.transition;

                htmlEl.style.transition = 'background-color 0.5s ease';
                htmlEl.style.backgroundColor = 'rgba(79, 70, 229, 0.2)';

                setTimeout(() => {
                    htmlEl.style.backgroundColor = originalBg;
                    setTimeout(() => {
                        htmlEl.style.transition = originalTransition;
                    }, 500);
                }, 2000);
            } else {
                console.warn(`[JumpToSection] Element with data-block-id="${targetBlockId}" not found in DOM`);
            }
        } else {
            console.warn(`[JumpToSection] Could not find block for "${sectionTitle}"`);
        }
    };

    const handleSelectionChange = (id: string, e: React.SyntheticEvent<HTMLTextAreaElement>) => {
        const target = e.currentTarget;
        activeBlockRef.current = {
            id,
            start: target.selectionStart,
            end: target.selectionEnd
        };
    };

    const handleInsertMedia = (mediaItem: MediaItem) => {
        setShowMediaSelector(false);

        let targetBlockId = activeBlockRef.current?.id;
        let insertIndex = activeBlockRef.current?.start || 0;

        // If no active block, try to find the last text block or create one
        if (!targetBlockId) {
            const lastBlock = blocks[blocks.length - 1];
            if (lastBlock && lastBlock.type === 'text') {
                targetBlockId = lastBlock.id;
                insertIndex = lastBlock.content?.length || 0;
            } else {
                // Determine logic if no suitable block found (e.g. append)
                // For now, let's just append to the end of the document if we can't find a place
                const newContent = localContent + `\n\n![${mediaItem.name}](${mediaItem.url})`;
                handleUpdateContent(newContent);
                return;
            }
        }

        // Find the block
        const blockIndex = blocks.findIndex(b => b.id === targetBlockId);
        if (blockIndex === -1) return;

        const block = blocks[blockIndex];
        if (block.type !== 'text') return; // Should not happen based on logic above

        const content = block.content || '';
        const newBlockContent = content.slice(0, insertIndex) +
            `\n![${mediaItem.name}](${mediaItem.url})\n` +
            content.slice(insertIndex);

        // Update the specific block first
        const newBlocks = [...blocks];
        newBlocks[blockIndex] = { ...block, content: newBlockContent };

        // Serialize back to markdown which will trigger re-parsing in handleUpdateContent
        // This is important because the inserted markdown needs to be split into its own Image block
        const newMarkdown = serializeBlocksToMarkdown(newBlocks);
        handleUpdateContent(newMarkdown);
    };

    // Clean up timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, []);

    if (!currentVersion) {
        return <div className="text-center py-12 text-slate-400">Version not found</div>;
    }

    // Research Selection Modal
    if (showResearchSelector) {
        return (
            <ResearchSelector
                topic={article.topic}
                existingResearch={existingResearch}
                onSelect={handleResearchSelection}
                onCancel={() => setShowResearchSelector(false)}
            />
        );
    }

    if (showMediaSelector) {
        return (
            <MediaSelectorModal
                onSelect={handleInsertMedia}
                onClose={() => setShowMediaSelector(false)}
            />
        );
    }

    const setScheduleIn = (minutes: number) => {
        const now = new Date();
        const future = new Date(now.getTime() + minutes * 60000);
        setScheduleDate(format(future, "yyyy-MM-dd'T'HH:mm"));
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            {/* ... (Header code remains unchanged, but we are inside the component return) ... */}
            {/* Header */}
            <div className="flex items-center justify-between sticky top-0 bg-slate-950/80 backdrop-blur z-40 py-4 -mx-4 px-4 border-b border-slate-800/50">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-white">{article.topic}</h1>
                        <p className="text-sm text-slate-400">
                            {sortedVersions.length} version{sortedVersions.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowPreview(!showPreview)}
                        className="btn-secondary px-3 py-2 rounded-lg flex items-center gap-2"
                    >
                        <Eye size={18} />
                        <span className="hidden sm:inline">{showPreview ? 'Edit' : 'Preview'}</span>
                    </button>
                    <button
                        onClick={handleRegenerateClick}
                        disabled={isRegenerating}
                        className="btn-secondary px-3 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw size={18} className={isRegenerating ? 'animate-spin' : ''} />
                        <span className="hidden sm:inline">Regenerate</span>
                    </button>
                    <button
                        onClick={handlePublish}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Send size={18} />
                        <span>Publish to Posts</span>
                    </button>
                    <button
                        onClick={handleSyncHero}
                        disabled={isRefreshing}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700"
                        title="Sync Hero Image from Content"
                    >
                        <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => setShowMediaSelector(true)}
                        className="btn-secondary px-3 py-2 rounded-lg flex items-center gap-2"
                        title="Insert Image"
                    >
                        <ImageIcon size={18} />
                        <span className="hidden sm:inline">Insert Media</span>
                    </button>
                </div>
            </div>

            {/* Hero Image Preview */}
            {article.heroImage && (
                <div className="relative h-48 w-full group overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-2xl">
                    <img src={article.heroImage} className="w-full h-full object-cover" alt="Hero" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                    <div className="absolute bottom-4 left-6 flex items-end justify-between right-6">
                        <div>
                            <span className="px-2 py-1 bg-indigo-500 text-white text-[10px] font-bold rounded uppercase tracking-wider">Hero Image</span>
                        </div>
                        <button
                            onClick={handleSyncHero}
                            className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors bg-slate-950/50 px-2 py-1 rounded"
                        >
                            <RefreshCw size={10} />
                            Change Hero
                        </button>
                    </div>
                </div>
            )}

            {/* Version Selector & Schedule */}
            <div className="flex flex-col md:flex-row gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                        Active Version
                    </label>
                    <div className="relative">
                        <select
                            value={currentVersionId}
                            onChange={(e) => handleVersionChange(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white appearance-none cursor-pointer pr-10"
                        >
                            {sortedVersions.map((version, index) => (
                                <option key={version.id} value={version.id}>
                                    Version {sortedVersions.length - index} - {format(version.createdAt, 'MMM d, h:mm a')} ({version.generatedBy})
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                    </div>
                </div>

                <div className="flex-1">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-slate-400">
                            Schedule Publication
                        </label>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setScheduleIn(1)}
                                className="text-[10px] bg-slate-800 hover:bg-indigo-500 hover:text-white px-2 py-0.5 rounded text-slate-400 transition-colors border border-slate-700 hover:border-indigo-500"
                                title="Schedule 1 minute from now"
                            >
                                +1m
                            </button>
                            <button
                                onClick={() => setScheduleIn(5)}
                                className="text-[10px] bg-slate-800 hover:bg-indigo-500 hover:text-white px-2 py-0.5 rounded text-slate-400 transition-colors border border-slate-700 hover:border-indigo-500"
                                title="Schedule 5 minutes from now"
                            >
                                +5m
                            </button>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input
                                type="datetime-local"
                                value={scheduleDate}
                                onChange={(e) => setScheduleDate(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white"
                            />
                        </div>
                        <button
                            onClick={handleSaveSchedule}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                        >
                            <Save size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                {showPreview ? (
                    <div className="p-8">
                        {(() => {
                            console.log('Preview localContent:', localContent);
                            console.log('Preview currentVersion.content:', currentVersion.content);
                            return null;
                        })()}
                        <MarkdownRenderer content={localContent} />
                    </div>
                ) : (
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-slate-400">
                                <FileText size={18} />
                                <span className="text-sm">
                                    {localContent.split(/\s+/).filter(Boolean).length} words
                                </span>
                            </div>
                            {currentVersion.generatedBy === 'ai' && (
                                <div className="flex items-center gap-2 text-indigo-400 text-sm">
                                    <Sparkles size={14} />
                                    <span>AI Generated</span>
                                </div>
                            )}
                        </div>
                        <div className="space-y-4 min-h-[500px]">
                            {blocks.map((block, index) => (
                                <div key={block.id} data-block-id={block.id} className="relative group rounded-lg transition-colors duration-500">
                                    {block.type === 'text' ? (
                                        <textarea
                                            value={block.content}
                                            onChange={(e) => updateBlockContent(block.id, e.target.value)}
                                            onSelect={(e) => handleSelectionChange(block.id, e)}
                                            onClick={(e) => handleSelectionChange(block.id, e)}
                                            onKeyUp={(e) => handleSelectionChange(block.id, e)}
                                            placeholder="Continue writing..."
                                            className="w-full bg-transparent text-lg text-slate-300 placeholder-slate-700 outline-none resize-none font-mono leading-relaxed px-4 py-2 border-l-2 border-transparent focus:border-indigo-500/50 transition-colors"
                                            style={{ height: 'auto', minHeight: '60px' }}
                                            onInput={(e) => {
                                                const target = e.target as HTMLTextAreaElement;
                                                target.style.height = 'auto';
                                                target.style.height = target.scrollHeight + 'px';
                                            }}
                                            ref={(el) => {
                                                if (el) {
                                                    el.style.height = 'auto';
                                                    el.style.height = el.scrollHeight + 'px';
                                                }
                                            }}
                                        />
                                    ) : (
                                        <div className="mx-4 my-6 relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900/50 group/img shadow-2xl">
                                            <img
                                                src={block.url}
                                                alt={block.alt}
                                                className="w-full h-auto max-h-[600px] object-contain"
                                            />
                                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover/img:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => moveBlock(index, 'up')}
                                                    disabled={index === 0}
                                                    title="Move block up"
                                                    className="p-2 bg-slate-900/80 backdrop-blur text-slate-400 hover:text-white rounded-lg border border-slate-700 disabled:opacity-30"
                                                >
                                                    <MoveUp size={16} />
                                                </button>
                                                <button
                                                    onClick={() => moveBlock(index, 'down')}
                                                    disabled={index === blocks.length - 1}
                                                    title="Move block down"
                                                    className="p-2 bg-slate-900/80 backdrop-blur text-slate-400 hover:text-white rounded-lg border border-slate-700 disabled:opacity-30"
                                                >
                                                    <MoveDown size={16} />
                                                </button>
                                                <button
                                                    onClick={() => deleteBlock(block.id)}
                                                    title="Delete block"
                                                    className="p-2 bg-red-500/80 backdrop-blur text-white rounded-lg border border-red-500/50 hover:bg-red-600 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
                                                <p className="text-xs text-slate-400 italic">
                                                    {block.alt || 'No description'}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        {currentResearch && (
                            <div className="mt-4 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                                <div className="flex items-center gap-2 text-indigo-300 text-sm mb-2">
                                    <Database size={16} />
                                    <span className="font-semibold">Research Used</span>
                                </div>
                                <p className="text-xs text-indigo-200/70">
                                    Revision {currentResearch.revisionId} • {format(currentResearch.createdAt, 'MMM d, yyyy h:mm a')}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Image Prompt Management */}
            <ImagePromptManager
                articleId={article.id}
                topic={article.topic}
                content={currentVersion?.content || ''}
                onUpdateContent={handleUpdateContent}
                onJumpToSection={handleJumpToSection}
            />

            {/* Version History */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">Version History</h3>
                    <button
                        onClick={() => setIsVersionHistoryCollapsed(!isVersionHistoryCollapsed)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                    >
                        <ChevronDown className={`w-4 h-4 transition-transform ${isVersionHistoryCollapsed ? '' : 'rotate-180'}`} />
                        {isVersionHistoryCollapsed ? 'Expand' : 'Collapse'}
                    </button>
                </div>
                {!isVersionHistoryCollapsed && (
                    <div className="space-y-2">
                        {sortedVersions.map((version, index) => (
                            <div
                                key={version.id}
                                className={`p-4 rounded-lg border transition-colors cursor-pointer ${version.id === currentVersionId
                                    ? 'bg-indigo-500/10 border-indigo-500/30'
                                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                                    }`}
                                onClick={() => handleVersionChange(version.id)}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-white">
                                            Version {sortedVersions.length - index}
                                        </p>
                                        <p className="text-sm text-slate-400">
                                            {format(version.createdAt, 'MMM d, yyyy h:mm a')} • {version.generatedBy}
                                        </p>
                                    </div>
                                    <div className="text-sm text-slate-500">
                                        {version.content.split(/\s+/).length} words
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
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

export default ArticleEditor;
