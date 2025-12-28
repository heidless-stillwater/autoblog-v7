import { useState } from 'react';
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
import { format } from 'date-fns';
import ResearchSelector from './ResearchSelector';
import type { Article, ArticleVersion, PerplexityPrompt } from '../types';

interface ArticleEditorProps {
    article: Article;
}

const ArticleEditor = ({ article }: ArticleEditorProps) => {
    const navigate = useNavigate();
    const { updateArticle, addArticleVersion, addPost, settings, getResearchByTopic, addResearch, perplexityPrompts } = useStore();

    const [currentVersionId, setCurrentVersionId] = useState(article.currentVersionId);
    const [showPreview, setShowPreview] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [showResearchSelector, setShowResearchSelector] = useState(false);
    const [existingResearch, setExistingResearch] = useState<PerplexityPrompt[]>([]);
    const [scheduleDate, setScheduleDate] = useState(
        article.scheduleDate ? new Date(article.scheduleDate).toISOString().slice(0, 16) : ''
    );

    const currentVersion = article.versions.find(v => v.id === currentVersionId);
    const sortedVersions = [...article.versions].sort((a, b) => b.createdAt - a.createdAt);

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
            if (!confirm('Generate a new version of this article? This will use your Perplexity API credits.')) {
                return;
            }
        }

        setIsRegenerating(true);
        try {
            const cachedResearch = research ? {
                prompt: research.prompt,
                response: research.response
            } : undefined;

            const result = await generateWithResearch(article.topic, settings, cachedResearch);

            if (result.error) {
                alert(`Error: ${result.error}`);
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
                alert('New version generated successfully!');
            }
        } catch (error) {
            alert('Failed to generate new version. Please try again.');
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

            alert('Article published to Posts as draft!');
            navigate('/posts');
        } catch (error) {
            alert('Failed to publish article. Please try again.');
        }
    };

    const handleSaveSchedule = async () => {
        const updates: Partial<Article> = {
            scheduleDate: scheduleDate ? new Date(scheduleDate).getTime() : undefined,
            status: scheduleDate ? 'scheduled' : 'draft'
        };
        await updateArticle(article.id, updates);
        alert('Schedule updated!');
    };

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

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between sticky top-0 bg-slate-950/80 backdrop-blur z-40 py-4 -mx-4 px-4 border-b border-slate-800/50">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/blog')}
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
                </div>
            </div>

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
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                        Schedule Publication
                    </label>
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
                        <MarkdownRenderer content={currentVersion.content} />
                    </div>
                ) : (
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-slate-400">
                                <FileText size={18} />
                                <span className="text-sm">
                                    {currentVersion.content.split(/\s+/).length} words
                                </span>
                            </div>
                            {currentVersion.generatedBy === 'ai' && (
                                <div className="flex items-center gap-2 text-indigo-400 text-sm">
                                    <Sparkles size={14} />
                                    <span>AI Generated</span>
                                </div>
                            )}
                        </div>
                        <div className="bg-black/20 rounded-lg p-6 font-mono text-sm text-slate-300 max-h-[600px] overflow-y-auto">
                            <pre className="whitespace-pre-wrap">{currentVersion.content}</pre>
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

            {/* Version History */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Version History</h3>
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
            </div>
        </div>
    );
};

export default ArticleEditor;
