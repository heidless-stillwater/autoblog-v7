import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { format } from 'date-fns';
import { Plus, Calendar, FileText, Clock, Trash2, Edit, Eye, Layers, RefreshCw, CheckSquare, Square, CheckCircle2, Search, Image as ImageIcon, Wand2 } from 'lucide-react';
import { useNavigate, useParams, Link, Navigate } from 'react-router-dom';
import ArticleEditor from '../components/ArticleEditor';
import SEOKeywordsModal from '../components/SEOKeywordsModal';
import StyleTransformerModal from '../components/StyleTransformerModal';
import ConfirmModal from '../components/ConfirmModal';
import type { Article, ArticleVersion } from '../types';
import { rewriteToStyle, optimizeForSEO } from '../services/aiService';

const ArticleManager = () => {
    const { articles, deleteArticle, syncHeroImages, isInitialized } = useStore();
    const navigate = useNavigate();
    const { id } = useParams();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [refreshProgress, setRefreshProgress] = useState<{ current: number; total: number } | null>(null);
    const [smoothProgress, setSmoothProgress] = useState(0);
    const [showSEOModal, setShowSEOModal] = useState(false);
    const [styleTransformArticle, setStyleTransformArticle] = useState<Article | null>(null);
    const [confirmModal, setConfirmModal] = useState<{
        message: string | React.ReactNode;
        onConfirm: () => void;
        onCancel?: () => void;
        confirmText?: string;
        cancelText?: string;
        showCancel?: boolean;
    } | null>(null);
    const { settings, addArticleVersion, updateArticle } = useStore();

    // Effect for smooth, incremental progress simulation (reused from AutoBlog)
    useEffect(() => {
        if (!isRefreshing || !refreshProgress) {
            if (!isRefreshing) setSmoothProgress(0);
            return;
        }

        const baseline = (refreshProgress.current / refreshProgress.total) * 100;
        if (smoothProgress < baseline) {
            setSmoothProgress(baseline);
        }

        const interval = setInterval(() => {
            setSmoothProgress(prev => {
                const targetMilestone = ((refreshProgress.current + 1) / refreshProgress.total) * 100;
                const baseline = (refreshProgress.current / refreshProgress.total) * 100;
                const limit = baseline + (targetMilestone - baseline) * 0.9;

                if (prev < limit) {
                    return Math.min(prev + (Math.random() * 0.2), limit);
                }
                return prev;
            });
        }, 200);

        return () => clearInterval(interval);
    }, [isRefreshing, refreshProgress]);

    // If ID is provided, show article editor
    if (id) {
        if (!isInitialized) {
            return (
                <div className="flex items-center justify-center min-h-[50vh]">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500"></div>
                </div>
            );
        }

        const article = articles.find(a => a.id === id);

        if (!article) {
            return <Navigate to="/admin/articles" replace />;
        }

        return <ArticleEditor key={article.id} article={article} />;
    }

    const sortedArticles = [...articles].sort((a, b) => b.createdAt - a.createdAt);

    const handleTogglePublish = async (article: Article) => {
        try {
            const newStatus = article.status === 'published' ? 'draft' : 'published';
            await updateArticle(article.id, { status: newStatus });
        } catch (error) {
            console.error('Error toggling publish status:', error);
            alert('Failed to update article status. Please try again.');
        }
    };

    const handleDelete = async (articleId: string) => {
        setConfirmModal({
            message: 'Are you sure you want to delete this article and all its versions?',
            onConfirm: async () => {
                await deleteArticle(articleId);
                const newSelected = new Set(selectedIds);
                newSelected.delete(articleId);
                setSelectedIds(newSelected);
                setConfirmModal(null);
            },
            onCancel: () => setConfirmModal(null)
        });
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

        setConfirmModal({
            message: `Are you sure you want to rewrite ${targetArticles.length} selected articles to match the new Blog Tone & Style Guide? This will create new versions for each article.`,
            onConfirm: () => {
                setConfirmModal(null);
                performStyleRefresh(targetArticles);
            },
            onCancel: () => setConfirmModal(null)
        });
    };

    const performStyleRefresh = async (targetArticles: Article[]) => {
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
            setConfirmModal({
                message: (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-emerald-400">
                            <CheckCircle2 size={24} />
                            <h3 className="text-lg font-bold">Style Refresh Complete!</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                                <p className="text-slate-500 text-xs uppercase font-bold mb-1">Updated</p>
                                <p className="text-2xl font-black text-white">{successCount}</p>
                            </div>
                            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                                <p className="text-slate-500 text-xs uppercase font-bold mb-1">Failed</p>
                                <p className="text-2xl font-black text-slate-400">{failCount}</p>
                            </div>
                        </div>
                    </div>
                ),
                onConfirm: () => setConfirmModal(null),
                showCancel: false,
                confirmText: 'Awesome'
            });
            setSelectedIds(new Set());
        } catch (error) {
            console.error('Refresh styles failed:', error);
            setConfirmModal({
                message: 'An error occurred during the style refresh.',
                onConfirm: () => setConfirmModal(null),
                showCancel: false
            });
        } finally {
            setIsRefreshing(false);
            setRefreshProgress(null);
        }
    };

    const handleSyncHeroImages = async () => {
        const targetIds = Array.from(selectedIds);
        if (targetIds.length === 0) return;

        setIsRefreshing(true);
        try {
            const result = await syncHeroImages(targetIds);
            setConfirmModal({
                message: (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-purple-400">
                            <ImageIcon size={24} />
                            <h3 className="text-lg font-bold">Hero Image Sync Complete!</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                                <p className="text-slate-500 text-xs uppercase font-bold mb-1">Updated</p>
                                <p className="text-2xl font-black text-white">{result.updated}</p>
                            </div>
                            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                                <p className="text-slate-500 text-xs uppercase font-bold mb-1">Failed</p>
                                <p className="text-2xl font-black text-slate-400">{result.failed}</p>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 italic">Note: Only articles missing a hero image are updated using the first image found in their content.</p>
                    </div>
                ),
                onConfirm: () => setConfirmModal(null),
                showCancel: false,
                confirmText: 'Got it'
            });
            setSelectedIds(new Set());
        } catch (error) {
            console.error('Sync hero images failed:', error);
            setConfirmModal({
                message: 'An error occurred during the hero image sync.',
                onConfirm: () => setConfirmModal(null),
                showCancel: false
            });
        } finally {
            setIsRefreshing(false);
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
            setConfirmModal({
                message: (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-emerald-400">
                            <CheckCircle2 size={24} />
                            <h3 className="text-lg font-bold">SEO Optimization Complete!</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                                <p className="text-slate-500 text-xs uppercase font-bold mb-1">Updated</p>
                                <p className="text-2xl font-black text-white">{successCount}</p>
                            </div>
                            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                                <p className="text-slate-500 text-xs uppercase font-bold mb-1">Failed</p>
                                <p className="text-2xl font-black text-slate-400">{failCount}</p>
                            </div>
                        </div>
                    </div>
                ),
                onConfirm: () => setConfirmModal(null),
                showCancel: false,
                confirmText: 'Done'
            });
            setSelectedIds(new Set());
        } catch (error) {
            console.error('SEO optimization failed:', error);
            setConfirmModal({
                message: 'An error occurred during the SEO optimization.',
                onConfirm: () => setConfirmModal(null),
                showCancel: false
            });
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
                    Article Manager
                </h1>

                <div className="flex items-center gap-3">
                    {articles.length > 0 && selectedIds.size > 0 && (
                        <>
                            <button
                                onClick={handleSyncHeroImages}
                                disabled={isRefreshing}
                                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors flex items-center gap-2 text-sm disabled:opacity-50 shadow-lg shadow-purple-500/20"
                                title={`Sync Hero Images for ${selectedIds.size} selected articles`}
                            >
                                <ImageIcon size={18} className={isRefreshing ? "animate-spin" : ""} />
                                {isRefreshing ? 'Syncing...' : `Sync Hero (${selectedIds.size})`}
                            </button>
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
                        onClick={() => navigate('/admin/topics')}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus size={20} />
                        <span>New Auto-Entry</span>
                    </button>
                </div>
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

            <div className="grid gap-4">
                {sortedArticles.length === 0 ? (
                    <div className="text-center py-20 bg-slate-900/30 border border-slate-800 rounded-xl border-dashed">
                        <FileText className="mx-auto text-slate-600 mb-4" size={48} />
                        <h3 className="text-xl font-medium text-white mb-2">No Articles Yet</h3>
                        <p className="text-slate-400 mb-6 max-w-sm mx-auto">
                            Use the Topic Manager to research and generate high-quality blog posts automatically.
                        </p>
                        <button
                            onClick={() => navigate('/admin/topics')}
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
                                data-testid="article-card"
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
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => handleToggleSelect(article.id)}
                                            className={`flex-shrink-0 transition-colors ${selectedIds.has(article.id) ? 'text-indigo-400' : 'text-slate-600 hover:text-slate-400'}`}
                                        >
                                            {selectedIds.has(article.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                                        </button>

                                        <div className="w-12 h-12 flex-shrink-0 bg-slate-800 rounded-lg overflow-hidden flex items-center justify-center text-slate-400 border border-slate-700/50">
                                            {article.heroImage ? (
                                                <img src={article.heroImage} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                <FileText size={20} />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <Link to={`/admin/articles/${article.id}`} className="block">
                                                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-indigo-400 transition-colors">
                                                    {article.topic}
                                                </h3>
                                            </Link>
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
                                                <span className={`px-2 py-0.5 rounded uppercase tracking-wider text-xs font-semibold border ${article.status === 'published'
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                    : article.status === 'draft'
                                                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                        : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                                    }`}>
                                                    {article.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => navigate(`/admin/articles/${article.id}`)}
                                            className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 rounded-lg text-sm border border-indigo-500/20 transition-colors flex items-center gap-2"
                                        >
                                            <Edit size={14} />
                                            Edit & Preview
                                        </button>
                                        <button
                                            onClick={() => handleTogglePublish(article)}
                                            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors flex items-center gap-2 ${article.status === 'published'
                                                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/20'
                                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/20'
                                                }`}
                                        >
                                            {article.status === 'published' ? <Eye size={14} className="text-amber-300" /> : <Eye size={14} />}
                                            {article.status === 'published' ? 'Unpublish' : 'Publish'}
                                        </button>
                                        <button
                                            onClick={() => setStyleTransformArticle(article)}
                                            className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                                            title="Style Transformer"
                                        >
                                            <Wand2 size={16} />
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

            {showSEOModal && (
                <SEOKeywordsModal
                    articles={articles.filter(a => selectedIds.has(a.id))}
                    onConfirm={proceedWithSEOOptimization}
                    onClose={() => setShowSEOModal(false)}
                />
            )}

            {styleTransformArticle && (
                <StyleTransformerModal
                    article={styleTransformArticle}
                    onClose={() => setStyleTransformArticle(null)}
                    onSuccess={() => {
                        setStyleTransformArticle(null);
                        setConfirmModal({
                            message: (
                                <div className="flex items-center gap-3 text-emerald-400">
                                    <CheckCircle2 size={24} />
                                    <div>
                                        <h3 className="font-bold text-lg">Style Applied!</h3>
                                        <p className="text-sm text-slate-400">A new version has been created for "{styleTransformArticle.topic}".</p>
                                    </div>
                                </div>
                            ),
                            onConfirm: () => setConfirmModal(null),
                            showCancel: false,
                            confirmText: 'Great'
                        });
                    }}
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

export default ArticleManager;
