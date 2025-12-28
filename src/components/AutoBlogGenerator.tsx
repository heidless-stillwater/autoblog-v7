import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { generateWithResearch } from '../services/aiService';
import { nanoid } from 'nanoid';
import { Sparkles, Calendar, CheckCircle, AlertTriangle, ArrowRight, Save as SaveIcon } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import ResearchSelector from './ResearchSelector';
import type { ArticleVersion, Article, PerplexityPrompt } from '../types';

interface AutoBlogGeneratorProps {
    onComplete: () => void;
    initialTopic?: string;
}

const AutoBlogGenerator = ({ onComplete, initialTopic }: AutoBlogGeneratorProps) => {
    const { settings, addArticle, getResearchByTopic, addResearch } = useStore();
    const [topic, setTopic] = useState(initialTopic || '');
    const [scheduleDate, setScheduleDate] = useState('');
    const [status, setStatus] = useState<'idle' | 'research-check' | 'generating' | 'review' | 'completed'>('idle');
    const [progress, setProgress] = useState<string[]>([]);
    const [generatedContent, setGeneratedContent] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [existingResearch, setExistingResearch] = useState<PerplexityPrompt[]>([]);
    const [selectedResearch, setSelectedResearch] = useState<PerplexityPrompt | null>(null);
    const [researchId, setResearchId] = useState<string | null>(null);

    // Simulate progress steps
    useEffect(() => {
        if (status === 'generating') {
            const steps = [
                'Initializing AI agent...',
                'Checking research cache...',
                selectedResearch ? 'Using cached research...' : 'Conducting new Perplexity research...',
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
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [status, selectedResearch]);

    useEffect(() => {
        if (initialTopic) {
            setTopic(initialTopic);
        }
    }, [initialTopic]);

    const handleCheckResearch = () => {
        if (!topic.trim()) return;
        if (!settings.perplexityApiKey) {
            setError('Missing Perplexity API Key. Please configure in Settings.');
            return;
        }

        // Check for existing research
        const existing = getResearchByTopic(topic);

        if (existing.length > 0) {
            setExistingResearch(existing);
            setStatus('research-check');
        } else {
            // No existing research, proceed to generate
            handleGenerate(null);
        }
    };

    const handleResearchSelection = (research: PerplexityPrompt | null) => {
        setSelectedResearch(research);
        setStatus('idle');
        handleGenerate(research);
    };

    const handleGenerate = async (research: PerplexityPrompt | null) => {
        if (!topic.trim()) return;
        if (!settings.perplexityApiKey) {
            setError('Missing Perplexity API Key. Please configure in Settings.');
            return;
        }

        // Ask for permission before making API call (only if generating new research)
        if (!research) {
            const confirmed = confirm(
                `Generate a 1000+ word article about "${topic}"?\n\n` +
                `This will use your Perplexity API credits and may take 30-60 seconds.\n\n` +
                `The AI will:\n` +
                `• Conduct real-time research\n` +
                `• Gather data and examples\n` +
                `• Write a comprehensive article\n` +
                `• Format with proper markdown\n\n` +
                `Continue?`
            );

            if (!confirmed) return;
        }

        setStatus('generating');
        setProgress([]);
        setError(null);

        try {
            const cachedResearch = research ? {
                prompt: research.prompt,
                response: research.response
            } : undefined;

            const result = await generateWithResearch(topic, settings, cachedResearch);

            if (result.error) {
                setError(result.error);
                setStatus('idle');
                return;
            }

            if (result.content) {
                setGeneratedContent(result.content);

                // Save research if it's new
                if (!research && result.researchPrompt && result.researchResponse) {
                    const newResearchId = await addResearch({
                        prompt: result.researchPrompt,
                        response: result.researchResponse,
                        topic: topic,
                        revisionId: 1, // Will be auto-calculated in service
                        createdAt: Date.now()
                    });
                    setResearchId(newResearchId);
                } else if (research) {
                    setResearchId(research.id);
                }

                setStatus('review');
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unknown error');
            setStatus('idle');
        }
    };

    const handleSave = async () => {
        const articleId = nanoid();
        const versionId = nanoid();
        const now = Date.now();

        const firstVersion: ArticleVersion = {
            id: versionId,
            content: generatedContent,
            title: `Article about ${topic}`,
            createdAt: now,
            generatedBy: 'ai',
            researchId: researchId || undefined,
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

        await addArticle(newArticle);
        setStatus('completed');
        setTimeout(() => {
            onComplete();
        }, 1500);
    };

    // Research Selection Modal
    if (status === 'research-check') {
        return (
            <ResearchSelector
                topic={topic}
                existingResearch={existingResearch}
                onSelect={handleResearchSelection}
                onCancel={() => setStatus('idle')}
            />
        );
    }

    if (status === 'review') {
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <CheckCircle className="text-emerald-400" />
                        Content Generated
                    </h2>

                    <div className="h-[400px] overflow-y-auto bg-black/20 p-4 rounded-lg mb-6 border border-slate-800/50">
                        <MarkdownRenderer content={generatedContent.trim()} />
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
                        <p className="font-bold mb-1">AI Research Agent with Caching</p>
                        <p className="opacity-80">
                            I will check for existing research on this topic. If found, you can reuse it to save API credits.
                            Otherwise, I'll conduct a live Perplexity research session, gather 1,000+ words of data-backed content,
                            and format it with proper headers and markdown.
                        </p>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        onClick={handleCheckResearch}
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

// Helper icon removed as it's now imported from lucide-react

export default AutoBlogGenerator;

