import { useState } from 'react';
import { format } from 'date-fns';
import { Database, RefreshCw, X, ChevronRight, AlertCircle } from 'lucide-react';
import type { PerplexityPrompt } from '../types';

interface ResearchSelectorProps {
    topic: string;
    existingResearch: PerplexityPrompt[];
    onSelect: (research: PerplexityPrompt | null) => void;
    onCancel: () => void;
}

const ResearchSelector = ({ topic, existingResearch, onSelect, onCancel }: ResearchSelectorProps) => {
    const [selectedResearch, setSelectedResearch] = useState<PerplexityPrompt | null>(
        existingResearch.length > 0 ? existingResearch[0] : null
    );
    const [showPreview, setShowPreview] = useState<string | false>(false);

    const handleUseSelected = () => {
        onSelect(selectedResearch);
    };

    const handleGenerateNew = () => {
        onSelect(null);
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-slate-800">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                <Database className="text-indigo-400" size={24} />
                                Research Cache Found
                            </h2>
                            <p className="text-slate-400 text-sm">
                                Found {existingResearch.length} cached research {existingResearch.length === 1 ? 'entry' : 'entries'} for: <span className="text-white font-medium">{topic}</span>
                            </p>
                        </div>
                        <button
                            onClick={onCancel}
                            className="text-slate-500 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Info Alert */}
                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4 flex gap-3">
                        <AlertCircle className="text-indigo-400 shrink-0 mt-0.5" size={20} />
                        <div className="text-sm text-indigo-300">
                            <p className="font-semibold mb-1">Save API Credits</p>
                            <p className="opacity-90">
                                You can reuse existing research to avoid making another Perplexity API call, or generate fresh research if you need updated information.
                            </p>
                        </div>
                    </div>

                    {/* Research List */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                            Available Research
                        </h3>
                        {existingResearch.map((research) => (
                            <div
                                key={research.id}
                                onClick={() => setSelectedResearch(research)}
                                className={`
                                    p-4 rounded-lg border-2 cursor-pointer transition-all
                                    ${selectedResearch?.id === research.id
                                        ? 'border-indigo-500 bg-indigo-500/10'
                                        : 'border-slate-800 bg-slate-800/30 hover:border-slate-700'
                                    }
                                `}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-mono bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
                                                Revision {research.revisionId}
                                            </span>
                                            <span className="text-xs text-slate-500">
                                                {format(research.createdAt, 'MMM d, yyyy • h:mm a')}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-300 line-clamp-2">
                                            {research.response.substring(0, 200)}...
                                        </p>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowPreview(research.id);
                                        }}
                                        className="text-indigo-400 hover:text-indigo-300 text-xs flex items-center gap-1 shrink-0"
                                    >
                                        Preview
                                        <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Preview Modal */}
                    {showPreview && (
                        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-white">Research Preview</h3>
                                    <button
                                        onClick={() => setShowPreview(false)}
                                        className="text-slate-500 hover:text-white"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6">
                                    <div className="prose prose-invert max-w-none">
                                        <pre className="whitespace-pre-wrap font-sans text-sm text-slate-300 bg-black/20 p-4 rounded-lg">
                                            {existingResearch.find(r => r.id === showPreview)?.response}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-slate-800 bg-slate-900/50">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={handleUseSelected}
                            disabled={!selectedResearch}
                            className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Database size={18} />
                            Use Selected Research
                        </button>
                        <button
                            onClick={handleGenerateNew}
                            className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 border border-slate-700"
                        >
                            <RefreshCw size={18} />
                            Generate Fresh Research
                        </button>
                    </div>
                    <p className="text-xs text-slate-500 text-center mt-3">
                        Generating fresh research will create Revision {existingResearch[0]?.revisionId + 1 || 1} and use API credits
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ResearchSelector;
