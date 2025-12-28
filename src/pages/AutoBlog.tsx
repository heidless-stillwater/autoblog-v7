import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { format } from 'date-fns';
import { Plus, Calendar, FileText, Clock, Trash2, Edit, Eye, Layers, RefreshCw, CheckSquare, Square, CheckCircle2, Search } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import AutoBlogGenerator from '../components/AutoBlogGenerator';
import ArticleEditor from '../components/ArticleEditor';
import TopicSelector from '../components/TopicSelector';
import SEOKeywordsModal from '../components/SEOKeywordsModal';
import type { Article, ArticleVersion } from '../types';
import { rewriteToStyle, optimizeForSEO } from '../services/aiService';

const AutoBlog = () => {
    const { articles, deleteArticle, addPost } = useStore();
    const navigate = useNavigate();
    const { id } = useParams();
    const [view, setView] = useState<'list' | 'create'>('list');
    const [selectedTopic, setSelectedTopic] = useState<string>();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [refreshProgress, setRefreshProgress] = useState<{ current: number; total: number } | null>(null);
    const [smoothProgress, setSmoothProgress] = useState(0);
    const [showSEOModal, setShowSEOModal] = useState(false);
    const { settings, addArticleVersion } = useStore();

    // Effect for smooth, incremental progress simulation
    useEffect(() => {
        if (!isRefreshing || !refreshProgress) {
            if (!isRefreshing) setSmoothProgress(0);
            return;
        }

        // Catch up to baseline immediately if we fall behind (when current increments)
        const baseline = (refreshProgress.current / refreshProgress.total) * 100;
        if (smoothProgress < baseline) {
            setSmoothProgress(baseline);
        }

        const interval = setInterval(() => {
            setSmoothProgress(prev => {
                const targetMilestone = ((refreshProgress.current + 1) / refreshProgress.total) * 100;
                const baseline = (refreshProgress.current / refreshProgress.total) * 100;

                // Allow simulated progress to crawl up to 90% of the way to the next milestone
                const limit = baseline + (targetMilestone - baseline) * 0.9;

                if (prev < limit) {
                    // Small increment to make it look active
                    return Math.min(prev + (Math.random() * 0.2), limit);
                }
                return prev;
            });
        }, 200);

        return () => clearInterval(interval);
    }, [isRefreshing, refreshProgress]);

    // If ID is provided, show article editor
    if (id) {
        const article = articles.find(a => a.id === id);
        if (!article) {
            navigate('/blog');
            return null;
        }
        return <ArticleEditor article={article} />;
    }

    const sortedArticles = [...articles].sort((a, b) => b.createdAt - a.createdAt);

    const handlePublish = async (article: Article) => {
        // Convert Article to Post and publish
        const currentVersion = article.versions.find(v => v.id === article.currentVersionId);
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

            alert('Article draft created in Posts! You can now edit and publish it.');
            navigate('/posts');
        } catch (error) {
            console.error('Error publishing article:', error);
            alert('Failed to publish article. Please try again.');
        }
    };

    const handleDelete = async (articleId: string) => {
        if (confirm('Delete this article and all its versions?')) {
            await deleteArticle(articleId);
            // Remove from selection if deleted
            const newSelected = new Set(selectedIds);
            newSelected.delete(articleId);
            setSelectedIds(newSelected);
        }
    };

    const handleToggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleToggleSelectAll = () => {
        if (selectedIds.size === articles.length && articles.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(articles.map(a => a.id)));
        }
    };

    const handleRefreshSelectedStyles = async () => {
        const targetArticles = articles.filter(a => selectedIds.has(a.id));
        if (!targetArticles.length) return;

        if (!confirm(`Are you sure you want to rewrite ${targetArticles.length} selected articles to match the new Blog Tone & Style Guide? This will create new versions for each article.`)) {
            return;
        }

        setIsRefreshing(true);
        setRefreshProgress({ current: 0, total: targetArticles.length });
        let successCount = 0;
        let failCount = 0;

        try {
            for (let i = 0; i < targetArticles.length; i++) {
                const article = targetArticles[i];
                const currentVersion = article.versions.find(v => v.id === article.currentVersionId);

                if (currentVersion) {
                    try {
                        const result = await rewriteToStyle(currentVersion.content, settings);
                        if (result.error) throw new Error(result.error);

                        const newVersion: ArticleVersion = {
                            id: crypto.randomUUID(),
                            title: currentVersion.title,
                            content: result.content,
                            createdAt: Date.now(),
                            generatedBy: 'ai',
                        };

                        await addArticleVersion(article.id, newVersion);
                        successCount++;
                    } catch (err) {
                        console.error(`Failed to rewrite article ${article.id}:`, err);
                        failCount++;
                    }
                }

                setRefreshProgress({ current: i + 1, total: targetArticles.length });
            }
            alert(`Style refresh complete!\nUpdated: ${successCount}\nFailed: ${failCount}`);
            setSelectedIds(new Set()); // Clear selection after refresh
        } catch (error) {
            console.error('Refresh styles failed:', error);
            alert('An error occurred during the style refresh.');
        } finally {
            setIsRefreshing(false);
            setRefreshProgress(null);
        }
    };

    const handleOptimizeSelectedSEO = () => {
        const hasSelected = articles.some(a => selectedIds.has(a.id));
        if (!hasSelected) return;
        setShowSEOModal(true);
    };

    const proceedWithSEOOptimization = async (keywordResults: { [articleId: string]: string[] }, style: string) => {
        const targetArticles = articles.filter(a => selectedIds.has(a.id) && keywordResults[a.id]?.length > 0);

        if (!targetArticles.length) {
            alert('No articles with selected keywords found.');
            setShowSEOModal(false);
            return;
        }

        setShowSEOModal(false);
        setIsRefreshing(true);
        setRefreshProgress({ current: 0, total: targetArticles.length });
        let successCount = 0;
        let failCount = 0;

        try {
            for (let i = 0; i < targetArticles.length; i++) {
                const article = targetArticles[i];
                const keywords = keywordResults[article.id].join(', ');
                const currentVersion = article.versions.find(v => v.id === article.currentVersionId);

                if (currentVersion) {
                    try {
                        const result = await optimizeForSEO(currentVersion.content, keywords, style, settings);
                        if (result.error) throw new Error(result.error);

                        const newVersion: ArticleVersion = {
                            id: crypto.randomUUID(),
                            title: currentVersion.title,
                            content: result.content,
                            createdAt: Date.now(),
                            generatedBy: 'ai',
                        };

                        await addArticleVersion(article.id, newVersion);
                        successCount++;
                    } catch (err) {
                        console.error(`Failed to SEO optimize article ${article.id}:`, err);
                        failCount++;
                    }
                }

                setRefreshProgress({ current: i + 1, total: targetArticles.length });
            }
            alert(`SEO optimization complete!\nUpdated: ${successCount}\nFailed: ${failCount}`);
            setSelectedIds(new Set()); // Clear selection after refresh
        } catch (error) {
            console.error('SEO optimization failed:', error);
            alert('An error occurred during the SEO optimization.');
        } finally {
            setIsRefreshing(false);
            setRefreshProgress(null);
        }
    };

    return (
        <div className="space-y-8 pb-20">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <span className="bg-indigo-500/20 text-indigo-400 p-2 rounded-lg">
                        <FileText size={24} />
                    </span>
                    Blog
                </h1>

                {view === 'list' && (
                    <div className="flex items-center gap-3">
                        {articles.length > 0 && selectedIds.size > 0 && (
                            <>
                                <button
                                    onClick={handleOptimizeSelectedSEO}
                                    disabled={isRefreshing}
                                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors flex items-center gap-2 text-sm disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                                    title={`Optimize ${selectedIds.size} selected articles for SEO`}
                                >
                                    <Search size={18} className={isRefreshing ? "animate-spin" : ""} />
                                    {isRefreshing ? 'Optimizing...' : `SEO Optimize (${selectedIds.size})`}
                                </button>
                                <button
                                    onClick={handleRefreshSelectedStyles}
                                    disabled={isRefreshing}
                                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors flex items-center gap-2 text-sm disabled:opacity-50 shadow-lg shadow-indigo-500/20"
                                    title={`Rewrite ${selectedIds.size} selected articles using the new Style Guide`}
                                >
                                    <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
                                    {isRefreshing ? 'Refreshing...' : `Refresh Style (${selectedIds.size})`}
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => setView('create')}
                            className="btn-primary flex items-center gap-2"
                        >
                            <Plus size={20} />
                            <span>New Auto-Entry</span>
                        </button>
                    </div>
                )}

                {view === 'create' && (
                    <button
                        onClick={() => setView('list')}
                        className="text-slate-400 hover:text-white"
                    >
                        Cancel
                    </button>
                )}
            </div>

            {/* Sticky Progress Indicator */}
            {refreshProgress && (
                <div className="sticky top-4 z-40 bg-slate-900/95 backdrop-blur-md border border-indigo-500/40 rounded-xl p-6 shadow-[0_0_30px_rgba(79,70,229,0.15)] transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400 border border-indigo-500/20 shadow-inner">
                                <RefreshCw size={24} className="animate-spin" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg m-0">Processing Article Updates</h3>
                                <p className="text-slate-400 text-sm m-0">Optimizing content performance...</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-indigo-400 font-mono font-black text-2xl tracking-tighter">
                                {Math.round(smoothProgress)}%
                            </span>
                        </div>
                    </div>

                    <div className="w-full bg-slate-800/50 rounded-full h-3.5 mb-2 overflow-hidden p-0.5 border border-slate-700">
                        <div
                            className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                            style={{ width: `${smoothProgress}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs font-medium text-slate-500 mt-2 px-1">
                        <span className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                            Processing article {refreshProgress.current} of {refreshProgress.total}
                        </span>
                        <span className="text-slate-400">{refreshProgress.total - refreshProgress.current} items left</span>
                    </div>
                </div>
            )}

            {view === 'create' ? (
                <AutoBlogGenerator onComplete={() => setView('list')} initialTopic={selectedTopic} />
            ) : (
                <div className="grid gap-4">
                    {/* Topic Selector Area */}
                    <TopicSelector
                        onSelectTopic={(topic) => {
                            // When a topic is selected, what happens?
                            // Requirement doesn't explicitly say, but implies it's used for generating.
                            // Maybe we can navigate to Create view with this topic pre-filled?
                            // For now, let's just log or maybe set it in local state if we want to pass it to simplified generator.
                            // But keeping it simple: selecting could copy to clipboard or just highlight.
                            // "user can trigger a refresh... topics are exclusively selectable"

                            // Let's scroll to top and maybe show a quick action or just highlight it.
                            console.log('Selected:', topic);
                            // Could trigger a "New Auto-Entry using this topic" action?
                            // Let's assume selecting a topic effectively starts the process or at least prepares it.
                            // If we want to use the topic, we probably want to pass it to AutoBlogGenerator.
                            // But AutoBlogGenerator is in 'create' view.

                            // Let's store selected topic in state
                            setSelectedTopic(topic);
                        }}
                        selectedTopic={selectedTopic}
                    />

                    {selectedTopic && (
                        <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-lg flex items-center justify-between mb-4 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center gap-2">
                                <FileText className="text-indigo-400" size={20} />
                                <span className="text-white font-medium">Selected: <span className="text-indigo-300">{selectedTopic}</span></span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        // Pass topic to generator? 
                                        // We need to modify AutoBlogGenerator to accept detailed props or use a store
                                        // For now, let's just go to create view.
                                        // Ideally AutoBlogGenerator should take initialTopic prop.
                                        setView('create');
                                    }}
                                    className="btn-primary text-xs px-3 py-1.5"
                                >
                                    Create Article
                                </button>
                                <button onClick={() => setSelectedTopic(undefined)} className="text-slate-400 hover:text-white px-2">Cancel</button>
                            </div>
                        </div>
                    )}


                    {sortedArticles.length === 0 ? (
                        <div className="text-center py-20 bg-slate-900/30 border border-slate-800 rounded-xl border-dashed">
                            <FileText className="mx-auto text-slate-600 mb-4" size={48} />
                            <h3 className="text-xl font-medium text-white mb-2">No Articles Yet</h3>
                            <p className="text-slate-400 mb-6 max-w-sm mx-auto">
                                Use the AI agent to research and generate high-quality blog posts automatically.
                            </p>
                            <button
                                onClick={() => setView('create')}
                                className="btn-primary"
                            >
                                Start First Article
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-2 text-slate-400 text-sm">
                                <button
                                    onClick={handleToggleSelectAll}
                                    className="flex items-center gap-2 hover:text-white transition-colors"
                                >
                                    {selectedIds.size === articles.length && articles.length > 0 ? (
                                        <CheckSquare size={18} className="text-indigo-400" />
                                    ) : (
                                        <Square size={18} />
                                    )}
                                    <span>{selectedIds.size === articles.length && articles.length > 0 ? 'Deselect All' : 'Select All Articles'}</span>
                                </button>
                                <span>{articles.length} Article{articles.length !== 1 ? 's' : ''} found</span>
                            </div>

                            {sortedArticles.map(article => (
                                <div
                                    key={article.id}
                                    className={`bg-slate-900/50 border rounded-xl p-6 transition-all group relative overflow-hidden ${selectedIds.has(article.id)
                                        ? 'border-indigo-500 ring-1 ring-indigo-500/50'
                                        : 'border-slate-800 hover:border-slate-700'
                                        }`}
                                >
                                    {selectedIds.has(article.id) && (
                                        <div className="absolute top-0 right-0 p-1">
                                            <div className="bg-indigo-500 text-white p-1 rounded-bl-lg">
                                                <CheckCircle2 size={14} />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <button
                                                onClick={() => handleToggleSelect(article.id)}
                                                className={`mt-1 flex-shrink-0 transition-colors ${selectedIds.has(article.id) ? 'text-indigo-400' : 'text-slate-600 hover:text-slate-400'}`}
                                            >
                                                {selectedIds.has(article.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                                            </button>

                                            <div className="p-2 bg-slate-800 rounded-lg text-slate-400">
                                                <FileText size={20} />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-indigo-400 transition-colors">
                                                    {article.topic}
                                                </h3>
                                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                                    <span className="flex items-center gap-1">
                                                        <Clock size={12} />
                                                        Generated {format(article.createdAt, 'MMM d, h:mm a')}
                                                    </span>
                                                    {article.scheduleDate && (
                                                        <span className="flex items-center gap-1 text-amber-400">
                                                            <Calendar size={12} />
                                                            Scheduled: {format(article.scheduleDate, 'MMM d, h:mm a')}
                                                        </span>
                                                    )}
                                                    <span className="flex items-center gap-1">
                                                        <Layers size={12} />
                                                        {article.versions.length} version{article.versions.length !== 1 ? 's' : ''}
                                                    </span>
                                                    <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300 uppercase tracking-wider">
                                                        {article.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => navigate(`/blog/${article.id}`)}
                                                className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 rounded-lg text-sm border border-indigo-500/20 transition-colors flex items-center gap-2"
                                            >
                                                <Edit size={14} />
                                                Edit & Preview
                                            </button>
                                            <button
                                                onClick={() => handlePublish(article)}
                                                className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 rounded-lg text-sm border border-emerald-500/20 transition-colors flex items-center gap-2"
                                            >
                                                <Eye size={14} />
                                                Publish
                                            </button>
                                            <button
                                                onClick={() => handleDelete(article.id)}
                                                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {showSEOModal && (
                <SEOKeywordsModal
                    articles={articles.filter(a => selectedIds.has(a.id))}
                    onConfirm={proceedWithSEOOptimization}
                    onClose={() => setShowSEOModal(false)}
                />
            )}
        </div>
    );
};

export default AutoBlog;
