import React, { useEffect, useState } from 'react';
import { promptVaultService } from '../services/promptVault';
import type { PromptVaultVersion, PromptVaultSet } from '../services/promptVault';
import { useAuth } from '../contexts/AuthContext';
import {
    RefreshCcw,
    Layers,
    History,
    ExternalLink,
    AlertCircle,
    Search,
    Image as ImageIcon,
    X,
    Maximize2
} from 'lucide-react';
import clsx from 'clsx';

const PromptVault: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [versions, setVersions] = useState<PromptVaultVersion[]>([]);
    const [promptSets, setPromptSets] = useState<PromptVaultSet[]>([]);
    const [activeTab, setActiveTab] = useState<'iterations' | 'collections'>('iterations');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSet, setSelectedSet] = useState<PromptVaultSet | null>(null);

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const [versionsData, setsData] = await Promise.all([
                promptVaultService.getUserVersions(user.uid),
                promptVaultService.getUserPromptSets(user.uid)
            ]);
            setVersions(versionsData);
            setPromptSets(setsData);
        } catch (err) {
            console.error('Error fetching vault data:', err);
            setError(err instanceof Error ? err.message : 'Failed to load vault data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    const filteredVersions = (versions || []).filter(v =>
        v?.promptText?.toLowerCase()?.includes(searchQuery.toLowerCase())
    );

    const filteredSets = (promptSets || []).filter(s =>
        s?.name?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
        s?.description?.toLowerCase()?.includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Image Prompt Vault</h1>
                    <p className="text-slate-400 mt-1">Sync and manage your AI-generated iterations and collections from PromptVault.</p>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-all shadow-lg shadow-indigo-500/20"
                >
                    <RefreshCcw size={18} className={clsx(loading && "animate-spin")} />
                    <span>Sync Now</span>
                </button>
            </div>

            {/* Stats & Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl">
                    <div className="flex items-center gap-3 text-indigo-400 mb-2">
                        <History size={20} />
                        <span className="text-sm font-semibold uppercase tracking-wider">Total Iterations</span>
                    </div>
                    <div className="text-3xl font-bold text-white">{versions.length}</div>
                </div>
                <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl">
                    <div className="flex items-center gap-3 text-purple-400 mb-2">
                        <Layers size={20} />
                        <span className="text-sm font-semibold uppercase tracking-wider">Collections</span>
                    </div>
                    <div className="text-3xl font-bold text-white">{promptSets.length}</div>
                </div>
                <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl flex items-center">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search prompts or collections..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-800">
                <button
                    onClick={() => setActiveTab('iterations')}
                    className={clsx(
                        "px-6 py-3 text-sm font-medium transition-all relative",
                        activeTab === 'iterations' ? "text-indigo-400" : "text-slate-400 hover:text-slate-200"
                    )}
                >
                    Iterations
                    {activeTab === 'iterations' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
                </button>
                <button
                    onClick={() => setActiveTab('collections')}
                    className={clsx(
                        "px-6 py-3 text-sm font-medium transition-all relative",
                        activeTab === 'collections' ? "text-indigo-400" : "text-slate-400 hover:text-slate-200"
                    )}
                >
                    Collections
                    {activeTab === 'collections' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            )}

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeTab === 'iterations' ? (
                    filteredVersions.map((v) => (
                        <div key={v.id} className="group bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden hover:border-indigo-500/50 transition-all duration-300">
                            <div className="aspect-video relative overflow-hidden bg-slate-900">
                                {v.imageUrl ? (
                                    <img
                                        src={v.imageUrl}
                                        alt={v.promptText}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-700">
                                        <ImageIcon size={48} />
                                    </div>
                                )}
                                <div className="absolute top-3 right-3 px-2 py-1 bg-black/50 backdrop-blur-md rounded text-[10px] font-bold text-white uppercase tracking-wider border border-white/10">
                                    V{v.versionNumber}
                                </div>
                            </div>
                            <div className="p-4 space-y-3">
                                <p className="text-sm text-slate-300 line-clamp-3 font-medium">
                                    {v?.promptText || `Iteration #${v?.versionNumber || v?.id?.substring(0, 4)}`}
                                </p>
                                <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                                    <span className="text-xs text-slate-500">
                                        {new Date(v.createdAt).toLocaleDateString()}
                                    </span>
                                    <button className="text-indigo-400 hover:text-indigo-300 transition-colors">
                                        <ExternalLink size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    filteredSets.map((s) => {
                        const thumbnail = s.versions?.find(v => v.versionNumber === 1)?.imageUrl || s.versions?.[0]?.imageUrl;

                        return (
                            <div key={s.id} className="group bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden hover:border-purple-500/50 transition-all duration-300 flex flex-col">
                                <div className="aspect-video relative overflow-hidden bg-slate-900 cursor-pointer" onClick={() => setSelectedSet(s)}>
                                    {thumbnail ? (
                                        <img
                                            src={thumbnail}
                                            alt={s.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-700">
                                            <Layers size={48} />
                                        </div>
                                    )}
                                    <div className="absolute top-3 right-3 px-2 py-1 bg-black/50 backdrop-blur-md rounded text-[10px] font-bold text-white uppercase tracking-wider border border-white/10 flex items-center gap-1">
                                        <History size={10} />
                                        {s.versions?.length || 0}
                                    </div>
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Maximize2 size={24} className="text-white" />
                                    </div>
                                </div>
                                <div className="p-5 space-y-3 flex-1">
                                    <button
                                        onClick={() => setSelectedSet(s)}
                                        className="text-lg font-bold text-white hover:text-indigo-400 hover:underline decoration-indigo-500/50 underline-offset-4 transition-all uppercase tracking-tight text-left block w-full truncate"
                                    >
                                        {s?.name || `Set: ${s?.id?.substring(0, 8)}...`}
                                    </button>
                                    <p className="text-sm text-slate-400 line-clamp-2">
                                        {s.description || 'No description provided.'}
                                    </p>
                                    <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
                                        <span className="text-xs text-slate-500">
                                            {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'N/A'}
                                        </span>
                                        <button
                                            onClick={() => setSelectedSet(s)}
                                            className="px-3 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-[10px] font-bold text-purple-400 uppercase tracking-widest rounded-md transition-all"
                                        >
                                            View Versions
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}

                {!loading && (activeTab === 'iterations' ? filteredVersions : filteredSets).length === 0 && (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-500 space-y-4">
                        <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center">
                            <Layers size={40} className="text-slate-600" />
                        </div>
                        <div className="text-center">
                            <p className="text-lg font-medium text-slate-400">No {activeTab} found</p>
                            <p className="text-sm">Try syncing or adjusting your search query.</p>
                        </div>
                    </div>
                )}
            </div>

            {loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="bg-slate-800/40 h-64 rounded-2xl border border-slate-700/50" />
                    ))}
                </div>
            )}

            {/* Version Modal */}
            {selectedSet && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-xl sticky top-0 z-10">
                            <div>
                                <h2 className="text-2xl font-bold text-white uppercase tracking-tight">
                                    {selectedSet.name || `Set: ${selectedSet.id.substring(0, 8)}...`}
                                </h2>
                                <p className="text-slate-400 text-sm mt-1">{selectedSet.versions?.length || 0} iterations in this collection</p>
                            </div>
                            <button
                                onClick={() => setSelectedSet(null)}
                                className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-all"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {(selectedSet.versions || []).sort((a, b) => (Number(b.versionNumber) - Number(a.versionNumber))).map((v) => (
                                    <div key={v.id} className="group bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden hover:border-indigo-500/30 transition-all">
                                        <div className="aspect-video relative overflow-hidden bg-slate-900">
                                            {v.imageUrl ? (
                                                <img src={v.imageUrl} alt={v.promptText} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-700">
                                                    <ImageIcon size={48} />
                                                </div>
                                            )}
                                            <div className="absolute top-3 left-3 px-2 py-1 bg-indigo-600 rounded text-[10px] font-bold text-white uppercase tracking-wider border border-white/10">
                                                Version {v.versionNumber}
                                            </div>
                                            <a
                                                href={v.imageUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="absolute bottom-3 right-3 p-2 bg-black/50 backdrop-blur-md rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <ExternalLink size={16} />
                                            </a>
                                        </div>
                                        <div className="p-4 bg-slate-900/50">
                                            <p className="text-xs text-slate-300 line-clamp-4 font-medium italic leading-relaxed">
                                                "{v.promptText}"
                                            </p>
                                            <div className="mt-3 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                                                {new Date(v.createdAt).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PromptVault;
