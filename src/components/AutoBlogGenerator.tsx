import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { generateFullArticle } from '../services/aiService';
import { nanoid } from 'nanoid';
import { Sparkles, Calendar, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import type { ArticleVersion, Article } from '../types';

interface AutoBlogGeneratorProps {
    onComplete: () => void;
}

const AutoBlogGenerator = ({ onComplete }: AutoBlogGeneratorProps) => {
    const { settings, addArticle } = useStore();
    const [topic, setTopic] = useState('');
    const [scheduleDate, setScheduleDate] = useState('');
    const [status, setStatus] = useState<'idle' | 'generating' | 'review' | 'completed'>('idle');
    const [progress, setProgress] = useState<string[]>([]);
    const [generatedContent, setGeneratedContent] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Simulate progress steps
    useEffect(() => {
        if (status === 'generating') {
            const steps = [
                'Initializing AI agent...',
                'Analyzing topic trends...',
                'Conducting Perplexity research...',
                'Synthesizing insights...',
                'Drafting content...',
                'Optimizing for retention...',
                'Finalizing markdown...'
            ];

            let currentStep = 0;
            const interval = setInterval(() => {
                if (currentStep < steps.length) {
                    setProgress(prev => [...prev, steps[currentStep]]);
                    currentStep++;
                } else {
                    clearInterval(interval);
                }
            }, 1000); // Add a step every second

            return () => clearInterval(interval);
        }
    }, [status]);

    const handleGenerate = async () => {
        if (!topic.trim()) return;
        if (!settings.perplexityApiKey) {
            setError('Missing Perplexity API Key. Please configure in Settings.');
            return;
        }

        setStatus('generating');
        setProgress([]);
        setError(null);

        try {
            const result = await generateFullArticle(topic, settings);

            if (result.error) {
                setError(result.error);
                setStatus('idle');
                return;
            }

            if (result.content) {
                setGeneratedContent(result.content);
                setStatus('review');
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unknown error');
            setStatus('idle');
        }
    };

    const handleSave = () => {
        const articleId = nanoid();
        const versionId = nanoid();
        const now = Date.now();

        const firstVersion: ArticleVersion = {
            id: versionId,
            content: generatedContent,
            title: `Article about ${topic}`, // Basic title, user can edit later
            createdAt: now,
            generatedBy: 'ai',
        };

        const newArticle: Article = {
            id: articleId,
            topic: topic,
            status: scheduleDate ? 'scheduled' : 'draft',
            scheduleDate: scheduleDate ? new Date(scheduleDate).getTime() : undefined,
            currentVersionId: versionId,
            versions: [firstVersion],
            createdAt: now,
            updatedAt: now,
        };

        addArticle(newArticle);
        setStatus('completed');
        setTimeout(() => {
            onComplete();
        }, 1500);
    };

    if (status === 'review') {
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <CheckCircle className="text-emerald-400" />
                        Content Generated
                    </h2>

                    <div className="prose prose-invert max-w-none h-[400px] overflow-y-auto bg-black/20 p-4 rounded-lg mb-6 border border-slate-800/50">
                        <pre className="whitespace-pre-wrap font-mono text-sm text-slate-300">
                            {generatedContent}
                        </pre>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center justify-between">
                        <div className="space-y-2 w-full sm:w-auto">
                            <label className="block text-sm font-medium text-slate-400">Schedule Publication (Optional)</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                <input
                                    type="datetime-local"
                                    value={scheduleDate}
                                    onChange={(e) => setScheduleDate(e.target.value)}
                                    className="input-field pl-10 w-full sm:w-64"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setStatus('idle')}
                                className="px-4 py-2 rounded-lg hover:bg-slate-800 text-slate-400"
                            >
                                Discard
                            </button>
                            <button
                                onClick={handleSave}
                                className="btn-primary flex items-center gap-2"
                            >
                                <SaveIcon className="w-4 h-4" />
                                <span>Save Article</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (status === 'generating') {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-8 animate-fade-in">
                <div className="relative w-24 h-24">
                    <div className="absolute inset-0 border-4 border-indigo-500/30 rounded-full animate-pulse"></div>
                    <div className="absolute inset-0 border-t-4 border-indigo-500 rounded-full animate-spin"></div>
                    <Sparkles className="absolute inset-0 m-auto text-indigo-400 animate-pulse" size={32} />
                </div>

                <div className="w-full max-w-md bg-slate-900 rounded-lg overflow-hidden border border-slate-800 font-mono text-xs shadow-2xl">
                    <div className="bg-slate-800 p-2 flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                        <div className="w-3 h-3 rounded-full bg-amber-500/50"></div>
                        <div className="w-3 h-3 rounded-full bg-emerald-500/50"></div>
                    </div>
                    <div className="p-4 space-y-2 h-[200px] overflow-y-auto flex flex-col-reverse">
                        {progress.slice().reverse().map((step, i) => (
                            <div key={i} className="text-emerald-400 flex gap-2">
                                <span className="opacity-50">➜</span>
                                <span>{step}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (status === 'completed') {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle className="text-emerald-400" size={32} />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Article Saved!</h2>
                <p className="text-slate-400">Your generated content has been saved to drafts.</p>
            </div>
        );
    }

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 animate-fade-in">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Sparkles className="text-indigo-400" />
                New Autoblog Entry
            </h2>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg mb-6 flex items-start gap-3">
                    <AlertTriangle className="shrink-0 mt-0.5" />
                    <div>{error}</div>
                </div>
            )}

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">
                        What topic should we research?
                    </label>
                    <input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="E.g., The Future of Sustainable Energy..."
                        className="input-field w-full text-lg"
                    />
                </div>

                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4 text-sm text-indigo-300 flex gap-3">
                    <div className="shrink-0 p-2 bg-indigo-500/20 rounded-lg h-fit">
                        <Sparkles size={16} />
                    </div>
                    <div>
                        <p className="font-bold mb-1">AI Research Agent</p>
                        <p className="opacity-80">
                            I will conduct a live Perplexity research session, gather 1,000+ words of data-backed content,
                            and format it with proper headers and markdown. This process takes about 30-60 seconds.
                        </p>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        onClick={handleGenerate}
                        disabled={!topic.trim()}
                        className="btn-primary flex items-center gap-2 px-6 py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span>Start Agent</span>
                        <ArrowRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

// Helper icon
const SaveIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
);

export default AutoBlogGenerator;
