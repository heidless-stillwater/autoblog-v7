import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { generateSEOKeywords } from '../services/aiService';
import { X, Search, CheckCircle2, Loader2, CheckSquare, Square, AlertCircle } from 'lucide-react';
import type { Article } from '../types';

interface SEOKeywordsModalProps {
    articles: Article[];
    onConfirm: (results: { [articleId: string]: string[] }, style: string) => void;
    onClose: () => void;
}

interface ArticleKeywords {
    id: string;
    topic: string;
    keywords: string[];
    selected: string[];
    isLoading: boolean;
    error?: string;
}

const SEOKeywordsModal = ({ articles, onConfirm, onClose }: SEOKeywordsModalProps) => {
    const { settings } = useStore();
    const [articleData, setArticleData] = useState<ArticleKeywords[]>([]);
    const [style, setStyle] = useState('persuasive');
    const writingStyles = ['persuasive', 'formal', 'casual', 'punchy', 'friendly'];
    const [isGenerating, setIsGenerating] = useState(true);

    useEffect(() => {
        const initKeywords = async () => {
            setIsGenerating(true);
            const initialData = articles.map(a => ({
                id: a.id,
                topic: a.topic,
                keywords: [],
                selected: [],
                isLoading: true,
            }));
            setArticleData(initialData);

            const promises = articles.map(async (article) => {
                const currentVersion = article.versions.find(v => v.id === article.currentVersionId);
                if (!currentVersion) return;

                try {
                    const result = await generateSEOKeywords(currentVersion.content, settings);
                    setArticleData(prev => prev.map(item =>
                        item.id === article.id
                            ? { ...item, keywords: result.keywords, selected: result.keywords, isLoading: false, error: result.error }
                            : item
                    ));
                } catch (err) {
                    setArticleData(prev => prev.map(item =>
                        item.id === article.id
                            ? { ...item, isLoading: false, error: 'Failed to generate keywords' }
                            : item
                    ));
                }
            });

            await Promise.all(promises);
            setIsGenerating(false);
        };

        initKeywords();
    }, [articles, settings]);

    const toggleKeyword = (articleId: string, keyword: string) => {
        setArticleData(prev => prev.map(item => {
            if (item.id === articleId) {
                const newSelected = item.selected.includes(keyword)
                    ? item.selected.filter(k => k !== keyword)
                    : [...item.selected, keyword];
                return { ...item, selected: newSelected };
            }
            return item;
        }));
    };

    const toggleSelectAll = (articleId: string) => {
        setArticleData(prev => prev.map(item => {
            if (item.id === articleId) {
                const newSelected = item.selected.length === item.keywords.length ? [] : [...item.keywords];
                return { ...item, selected: newSelected };
            }
            return item;
        }));
    };

    const handleConfirm = () => {
        const results: { [articleId: string]: string[] } = {};
        articleData.forEach(item => {
            results[item.id] = item.selected;
        });
        onConfirm(results, style);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden shadow-indigo-500/10">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                            <Search size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">SEO Optimization</h2>
                            <p className="text-slate-400 text-sm">Select target keywords for each article</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Common Style Input */}
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-800">
                        <label className="block text-sm font-medium text-slate-300 mb-2">Writing Style</label>
                        <select
                            value={style}
                            onChange={(e) => setStyle(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all appearance-none cursor-pointer"
                        >
                            {writingStyles.map(s => (
                                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-6">
                        {articleData.map((item) => (
                            <div key={item.id} className="space-y-3">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                    <h3 className="font-bold text-slate-200 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                        {item.topic}
                                    </h3>
                                    {!item.isLoading && !item.error && (
                                        <button
                                            onClick={() => toggleSelectAll(item.id)}
                                            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                                        >
                                            {item.selected.length === item.keywords.length ? 'Deselect All' : 'Select All'}
                                        </button>
                                    )}
                                </div>

                                {item.isLoading ? (
                                    <div className="flex items-center gap-2 text-slate-500 py-4 animate-pulse">
                                        <Loader2 className="animate-spin" size={16} />
                                        <span className="text-sm">Analyzing content...</span>
                                    </div>
                                ) : item.error ? (
                                    <div className="flex items-center gap-2 text-red-400 py-4">
                                        <AlertCircle size={16} />
                                        <span className="text-sm">{item.error}</span>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                        {item.keywords.map((kw) => (
                                            <button
                                                key={kw}
                                                onClick={() => toggleKeyword(item.id, kw)}
                                                className={`flex items-center gap-2 p-2 rounded-lg text-sm text-left transition-all ${item.selected.includes(kw)
                                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 ring-1 ring-emerald-500/20'
                                                    : 'bg-slate-800/30 border-slate-800 text-slate-400 hover:bg-slate-800/50'
                                                    } border`}
                                            >
                                                {item.selected.includes(kw) ? (
                                                    <CheckSquare size={16} className="text-emerald-500" />
                                                ) : (
                                                    <Square size={16} className="text-slate-600" />
                                                )}
                                                <span className="truncate">{kw}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 bg-slate-900/50">
                    <div className="flex items-center justify-between gap-4">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 text-slate-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={isGenerating || articleData.every(a => a.selected.length === 0)}
                            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl shadow-lg shadow-emerald-500/20 font-bold transition-all flex items-center gap-2"
                        >
                            {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                            <span>Start SEO Optimization</span>
                        </button>
                    </div>
                    {articleData.some(a => a.selected.length === 0 && !a.isLoading) && (
                        <p className="mt-4 text-xs text-amber-500 flex items-center gap-2 justify-center">
                            <AlertCircle size={12} />
                            Some articles have no keywords selected and will be skipped.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SEOKeywordsModal;
