import { useState } from 'react';
import { useStore } from '../store';
import { rewriteToStyle, BLOG_STYLE_GUIDE } from '../services/aiService';
import type { Article, ArticleVersion } from '../types';
import { Sparkles, X, RefreshCw, Wand2 } from 'lucide-react';

interface StyleTransformerModalProps {
    article: Article;
    onClose: () => void;
    onSuccess: (newVersion: ArticleVersion) => void;
}

const StyleTransformerModal = ({ article, onClose, onSuccess }: StyleTransformerModalProps) => {
    const { settings, addArticleVersion } = useStore();
    const [instructions, setInstructions] = useState(BLOG_STYLE_GUIDE);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleApply = async () => {
        setIsProcessing(true);
        setError(null);

        try {
            const currentVersion = article.versions.find(v => v.id === article.currentVersionId);
            if (!currentVersion) throw new Error('Current version not found');

            const result = await rewriteToStyle(currentVersion.content, settings, instructions);

            if (result.error) {
                setError(result.error);
                return;
            }

            const newVersion: ArticleVersion = {
                id: crypto.randomUUID(),
                title: currentVersion.title,
                content: result.content,
                createdAt: Date.now(),
                generatedBy: 'ai',
            };

            await addArticleVersion(article.id, newVersion);
            onSuccess(newVersion);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
                onClick={!isProcessing ? onClose : undefined}
            />

            <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                            <Wand2 size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Style Transformer</h2>
                            <p className="text-xs text-slate-400">Configure instructions for: {article.topic}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isProcessing}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center justify-between">
                            <span>Rewriting Instructions</span>
                            <button
                                onClick={() => setInstructions(BLOG_STYLE_GUIDE)}
                                className="text-[10px] text-indigo-400 hover:text-indigo-300 uppercase tracking-wider font-bold"
                            >
                                Reset to Default
                            </button>
                        </label>
                        <textarea
                            value={instructions}
                            onChange={(e) => setInstructions(e.target.value)}
                            className="w-full h-80 bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-300 font-mono text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
                            placeholder="Enter custom style instructions..."
                        />
                    </div>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                </div>

                <div className="p-6 bg-slate-950/50 border-t border-slate-800 flex items-center justify-between">
                    <p className="text-xs text-slate-500 max-w-[60%]">
                        This will create a new version of the article based on these instructions.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={isProcessing}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleApply}
                            disabled={isProcessing}
                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-indigo-500/20"
                        >
                            {isProcessing ? (
                                <>
                                    <RefreshCw size={18} className="animate-spin" />
                                    <span>Transforming...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles size={18} />
                                    <span>Apply Style</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StyleTransformerModal;
