import React from 'react';
import {
    Zap, Search, Cpu,
    BookOpen, Book, Users,
    Bot, Brain, SearchIcon,
    X, AlertCircle
} from 'lucide-react';
import type { ToolCategory, ResearchTool, Settings } from '../types';

interface ResearchToolSelectorProps {
    settings: Settings;
    onSelect: (tool: ResearchTool) => void;
    onCancel: () => void;
}

interface ToolOption {
    id: ResearchTool;
    name: string;
    description: string;
    icon: React.ReactNode;
    isFree?: boolean;
    isAdvanced?: boolean;
    isReady: boolean;
}

const CATEGORIES: { id: ToolCategory; name: string; icon: React.ReactNode; color: string; tools: ToolOption[] }[] = [
    {
        id: 'debater',
        name: '"Debater" Tools',
        icon: <Search className="text-emerald-400" size={20} />,
        color: 'text-emerald-400',
        tools: [
            { id: 'perplexity', name: 'Perplexity', description: 'Real-time research & drafting', icon: <Zap size={18} />, isReady: true },
            { id: 'brave-goggles', name: 'Brave Search "goggles"', description: 'Custom search filters', icon: <SearchIcon size={18} />, isReady: false },
            { id: 'claude-4-5', name: 'Claude 4.5', description: 'Advanced reasoning & research', icon: <Cpu size={18} />, isReady: false },
        ]
    },
    {
        id: 'muse',
        name: '"Muse" Tools',
        icon: <BookOpen className="text-purple-400" size={20} />,
        color: 'text-purple-400',
        tools: [
            { id: 'sudowrite', name: 'Sudowrite', description: 'Prose Specialist', icon: <BookOpen size={18} />, isReady: false },
            { id: 'novelcrafter', name: 'Novelcrafter', description: 'Story structure expert', icon: <Book size={18} />, isReady: false },
            { id: 'character-ai', name: 'Character.ai', description: 'Persona-driven drafting', icon: <Users size={18} />, isReady: false },
        ]
    },
    {
        id: 'analyst',
        name: '"Analyst" Tools',
        icon: <Brain className="text-amber-400" size={20} />,
        color: 'text-amber-400',
        tools: [
            { id: 'gemini-deep', name: 'Gemini Deep Research', description: 'Recursive data gathering', icon: <Bot size={18} />, isAdvanced: true, isReady: false },
            { id: 'chatgpt-o1', name: 'ChatGPT Deep Research', description: 'o1-powered reasoning', icon: <Brain size={18} />, isAdvanced: true, isReady: false },
            { id: 'iask-ai', name: 'iAsk.ai', description: 'Best free alternative', icon: <Zap size={18} />, isFree: true, isReady: true },
        ]
    }
];

const ResearchToolSelector: React.FC<ResearchToolSelectorProps> = ({ settings, onSelect, onCancel }) => {
    // Check if tools are ready based on settings
    const checkIsReady = (toolId: ResearchTool): boolean => {
        switch (toolId) {
            case 'perplexity': return !!settings.perplexityApiKey;
            case 'brave-goggles': return !!settings.braveApiKey;
            case 'claude-4-5': return !!settings.claudeApiKey;
            case 'sudowrite': return !!settings.sudowriteApiKey;
            case 'novelcrafter': return !!settings.novelcrafterApiKey;
            case 'character-ai': return !!settings.characterAiApiKey;
            case 'gemini-deep': return !!settings.geminiApiKey;
            case 'chatgpt-o1': return !!settings.chatgptApiKey;
            case 'iask-ai': return true; // Free
            default: return false;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[150] p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col my-auto">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Brain className="text-indigo-400" size={28} />
                            Research Tool Selection
                        </h2>
                        <p className="text-slate-400 mt-1">Select the intelligence engine for this generation phase.</p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Categories Grid */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {CATEGORIES.map((category) => (
                        <div key={category.id} className="space-y-4">
                            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                                {category.icon}
                                <h3 className={`font-bold uppercase tracking-wider text-xs ${category.color}`}>
                                    {category.name}
                                </h3>
                            </div>

                            <div className="space-y-3">
                                {category.tools.map((tool) => {
                                    const isReady = checkIsReady(tool.id);
                                    return (
                                        <button
                                            key={tool.id}
                                            disabled={!isReady}
                                            onClick={() => onSelect(tool.id)}
                                            className={`w-full text-left p-4 rounded-xl border-2 transition-all flex flex-col gap-1 group
                                                ${isReady
                                                    ? 'border-slate-800 bg-slate-800/30 hover:border-indigo-500 hover:bg-indigo-500/5 cursor-pointer'
                                                    : 'border-slate-800/50 bg-slate-900/50 opacity-40 cursor-not-allowed'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className={`${isReady ? category.color : 'text-slate-600'} group-hover:scale-110 transition-transform`}>
                                                        {tool.icon}
                                                    </span>
                                                    <span className="font-bold text-slate-200 text-sm">{tool.name}</span>
                                                </div>
                                                {tool.isFree && (
                                                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase">Free</span>
                                                )}
                                                {tool.isAdvanced && (
                                                    <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded font-bold uppercase">Adv</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 line-clamp-1 group-hover:text-slate-400 transition-colors">
                                                {tool.description}
                                            </p>
                                            {!isReady && (
                                                <div className="mt-1 flex items-center gap-1 text-[10px] text-red-500/70">
                                                    <AlertCircle size={10} />
                                                    API Key Req.
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-950/50 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-800/50 px-3 py-1.5 rounded-lg">
                        <Zap size={14} className="text-amber-400" />
                        <span>Ready to proceed with selected engine.</span>
                    </div>

                    <button
                        onClick={onCancel}
                        className="w-full sm:w-auto px-6 py-2 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-white rounded-xl transition-all font-bold flex items-center justify-center gap-2 border border-slate-700 hover:border-red-500/50"
                    >
                        <X size={18} />
                        Cancel and Return to Queue
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ResearchToolSelector;
