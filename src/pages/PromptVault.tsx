import React, { useEffect, useState, useMemo } from 'react';
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
    Maximize2,
    Check,
    Copy,
    CheckCircle,
    AlertTriangle,
    RefreshCw,
    SkipForward,
    SortAsc,
    SortDesc,
    Filter
} from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../store';

const PromptVault: React.FC = () => {
    const { user } = useAuth();
    const { addMedia, media, updateMedia, settings, promptVaultSnapshot, loadPromptVaultSnapshot, setPromptVaultSnapshot } = useStore();
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [versions, setVersions] = useState<PromptVaultVersion[]>([]);
    const [promptSets, setPromptSets] = useState<PromptVaultSet[]>([]);
    const [activeTab, setActiveTab] = useState<'iterations' | 'collections'>('iterations');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSet, setSelectedSet] = useState<PromptVaultSet | null>(null);
    const [selectedVersionIds, setSelectedVersionIds] = useState<Set<string>>(new Set());
    const [copyingIds, setCopyingIds] = useState<Set<string>>(new Set());

    // Sort & Filter State
    const [sortBy, setSortBy] = useState<'date' | 'title' | 'set'>('date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [filterSetId, setFilterSetId] = useState<string>('all');

    // Conflict Resolution State
    const [conflictQueue, setConflictQueue] = useState<{ version: PromptVaultVersion, existingMediaId: string }[]>([]);
    const [isResolvingConflicts, setIsResolvingConflicts] = useState(false);

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

            // Snapshot the data
            setPromptVaultSnapshot({
                versions: versionsData,
                promptSets: setsData,
                lastUpdated: Date.now()
            });
        } catch (err) {
            console.error('Error fetching vault data:', err);
            setError(err instanceof Error ? err.message : 'Failed to load vault data');
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        // Load snapshot when user is available (store handles user check)
        if (user) {
            loadPromptVaultSnapshot();
        }
    }, [user, loadPromptVaultSnapshot]);

    useEffect(() => {
        // Initialize based on settings
        if (settings.promptVaultPermissionMode === 'never_ask') {
            setPermissionGranted(true);
        } else {
            setPermissionGranted(false);
        }
    }, [settings.promptVaultPermissionMode]);

    useEffect(() => {
        // If we have a snapshot and no current data, populate from snapshot
        // This acts as "offline" mode or "instant load"
        if (promptVaultSnapshot && versions.length === 0) {
            setVersions(promptVaultSnapshot.versions);
            setPromptSets(promptVaultSnapshot.promptSets);
        }
    }, [promptVaultSnapshot]);

    useEffect(() => {
        if (permissionGranted) {
            fetchData();
        }
    }, [user, permissionGranted]);

    const handleGrantPermission = () => {
        setPermissionGranted(true);
    };

    const filteredSets = (promptSets || []).filter(s =>
        s?.name?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
        s?.title?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
        s?.description?.toLowerCase()?.includes(searchQuery.toLowerCase())
    );

    const versionToSetMap = useMemo(() => {
        const map = new Map<string, PromptVaultSet>();
        (promptSets || []).forEach(set => {
            (set.versions || []).forEach(version => {
                map.set(version.id, set);
            });
        });
        return map;
    }, [promptSets]);

    const processedVersions = useMemo(() => {
        let result = (versions || []).filter(v =>
            v?.promptText?.toLowerCase()?.includes(searchQuery.toLowerCase())
        );

        // Filter by Set
        if (filterSetId !== 'all') {
            result = result.filter(v => versionToSetMap.get(v.id)?.id === filterSetId);
        }

        // Sort
        result.sort((a, b) => {
            let valA: string | number = '';
            let valB: string | number = '';

            switch (sortBy) {
                case 'date':
                    valA = new Date(a.createdAt).getTime();
                    valB = new Date(b.createdAt).getTime();
                    break;
                case 'title':
                    valA = (versionToSetMap.get(a.id)?.title || '').toLowerCase();
                    valB = (versionToSetMap.get(b.id)?.title || '').toLowerCase();
                    break;
                case 'set':
                    valA = (versionToSetMap.get(a.id)?.name || '').toLowerCase();
                    valB = (versionToSetMap.get(b.id)?.name || '').toLowerCase();
                    break;
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [versions, searchQuery, filterSetId, sortBy, sortDirection, versionToSetMap]);

    const handleToggleSelectOriginal = (id: string) => {
        setSelectedVersionIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const processCopyQueue = async (
        queue: { version: PromptVaultVersion, existingMediaId?: string, action?: 'replace' | 'skip' | 'add' }[]
    ) => {
        let processedCount = 0;

        for (const item of queue) {
            if (item.action === 'skip') continue;

            const parentSet = versionToSetMap.get(item.version.id);
            const title = parentSet?.title || parentSet?.name || 'Unknown Set';
            const mediaName = `vault-${item.version.id.substring(0, 8)}.png`; // Consistent naming for detection for now

            try {
                if (item.action === 'replace' && item.existingMediaId) {
                    await updateMedia(item.existingMediaId, {
                        url: item.version.imageUrl,
                        mediaPrompt: item.version.promptText,
                        tags: ['ImagePromptLib', title],
                        size: 0, // Reset size if tracked
                        createdAt: Date.now()
                    });
                } else {
                    // Default Add
                    await addMedia({
                        name: mediaName,
                        type: 'image/jpeg',
                        url: item.version.imageUrl,
                        createdAt: Date.now(),
                        size: 0,
                        tags: ['ImagePromptLib', title],
                        mediaPrompt: item.version.promptText
                    });
                }
            } catch (err) {
                console.error('Failed to process copy item:', item.version.id, err);
            }

            processedCount++;
            // setCopyProgress(prev => ({ ...prev, current: prev.current + 1 }));
        }
    };

    const handleCopy = async (specificVersion?: PromptVaultVersion) => {
        const versionsToCopy = specificVersion
            ? [specificVersion]
            : versions.filter(v => selectedVersionIds.has(v.id));

        if (versionsToCopy.length === 0) return;

        setCopyingIds(specificVersion ? new Set([specificVersion.id]) : new Set(selectedVersionIds));
        // setCopyProgress({ current: 0, total: versionsToCopy.length });

        // Split into clean vs conflict
        const newQueue: typeof conflictQueue = [];
        const cleanQueue: typeof conflictQueue = [];

        for (const v of versionsToCopy) {
            // Simple duplicate check by "name" or maybe content hash in future. 
            // For now using the predictable name scheme: `vault-{id_start}`
            const expectedName = `vault-${v.id.substring(0, 8)}.png`;
            const existing = media.find(m => m.name === expectedName);

            if (existing) {
                newQueue.push({ version: v, existingMediaId: existing.id });
            } else {
                cleanQueue.push({ version: v, existingMediaId: '' });
            }
        }

        // Process clean items immediately
        if (cleanQueue.length > 0) {
            await processCopyQueue(cleanQueue.map(i => ({ ...i, action: 'add' })));
        }

        // Handle conflicts
        if (newQueue.length > 0) {
            setConflictQueue(newQueue);
            setIsResolvingConflicts(true);
        } else {
            // Done
            setTimeout(() => {
                setCopyingIds(new Set());
                setSelectedVersionIds(new Set());
            }, 500);
        }
    };

    const resolveConflict = async (action: 'replace' | 'skip', applyToAll: boolean) => {
        if (conflictQueue.length === 0) return;

        const current = conflictQueue[0];
        const remaining = conflictQueue.slice(1);

        // Process current
        await processCopyQueue([{ ...current, action }]);

        if (applyToAll) {
            // Process all remaining with same action
            await processCopyQueue(remaining.map(item => ({ ...item, action })));
            setConflictQueue([]);
            setIsResolvingConflicts(false);
            setCopyingIds(new Set());
            if (!selectedVersionIds.has(current.version.id)) {
                // Was a single copy, minimal cleanup needed
            } else {
                setSelectedVersionIds(new Set());
            }
        } else {
            // Next item
            if (remaining.length > 0) {
                setConflictQueue(remaining);
            } else {
                setConflictQueue([]);
                setIsResolvingConflicts(false);
                setCopyingIds(new Set());
                if (selectedVersionIds.size > 0) setSelectedVersionIds(new Set());
            }
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Image Prompt Vault</h1>
                    <p className="text-slate-400 mt-1">Sync and manage your AI-generated iterations and collections from PromptVault.</p>
                </div>
                <div className="flex items-center gap-3">
                    {selectedVersionIds.size > 0 && activeTab === 'iterations' && (
                        <button
                            onClick={() => handleCopy()}
                            disabled={copyingIds.size > 0}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors animate-in fade-in slide-in-from-right-4 font-bold uppercase tracking-wide text-xs shadow-lg shadow-indigo-500/20"
                        >
                            {copyingIds.size > 0 ? (
                                <>
                                    <CheckCircle size={16} className="animate-pulse" />
                                    <span>Copying...</span>
                                </>
                            ) : (
                                <>
                                    <Copy size={16} />
                                    <span>Copy Selected ({selectedVersionIds.size})</span>
                                </>
                            )}
                        </button>
                    )}
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-all shadow-lg shadow-indigo-500/20"
                    >
                        <RefreshCcw size={18} className={clsx(loading && "animate-spin")} />
                        <span>Sync Now</span>
                    </button>
                </div>
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

            {/* Sort & Filter Controls (Iterations Only) */}
            {activeTab === 'iterations' && (
                <div className="flex items-center justify-end gap-2 mb-4 px-1">
                    <div className="relative">
                        <select
                            value={filterSetId}
                            onChange={(e) => setFilterSetId(e.target.value)}
                            className="appearance-none bg-slate-800 border border-slate-700 rounded-lg pl-3 pr-8 py-1.5 text-white focus:outline-none focus:border-indigo-500 text-xs max-w-[150px]"
                        >
                            <option value="all">All Collections</option>
                            {promptSets.map(set => (
                                <option key={set.id} value={set.id}>
                                    {set.title || set.name}
                                </option>
                            ))}
                        </select>
                        <Filter size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    <div className="relative">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="appearance-none bg-slate-800 border border-slate-700 rounded-lg pl-3 pr-8 py-1.5 text-white focus:outline-none focus:border-indigo-500 text-xs"
                        >
                            <option value="date">Date</option>
                            <option value="title">Title</option>
                            <option value="set">Collection</option>
                        </select>
                        {sortDirection === 'asc' ? (
                            <SortAsc size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        ) : (
                            <SortDesc size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        )}
                    </div>

                    <button
                        onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                        className="p-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white hover:border-indigo-500 transition-colors"
                        title={sortDirection === 'asc' ? "Switch to Descending" : "Switch to Ascending"}
                    >
                        {sortDirection === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />}
                    </button>
                </div>
            )}

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
                    processedVersions.map((v) => (
                        <div
                            key={v.id}
                            onClick={() => handleToggleSelectOriginal(v.id)}
                            className={clsx(
                                "group bg-slate-800/40 border rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer relative",
                                selectedVersionIds.has(v.id) ? "border-indigo-500 ring-1 ring-indigo-500/50" : "border-slate-700/50 hover:border-indigo-500/50"
                            )}>
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
                                <div className={clsx(
                                    "absolute top-3 left-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all bg-black/40 backdrop-blur-sm z-10",
                                    selectedVersionIds.has(v.id)
                                        ? "border-indigo-500 bg-indigo-600 text-white scale-100 opacity-100"
                                        : "border-white/30 text-transparent scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100 hover:border-white/60"
                                )}>
                                    <Check size={14} strokeWidth={4} />
                                </div>
                            </div>
                            <div className="p-4 space-y-3">
                                <div className="space-y-1">
                                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider truncate">
                                        {versionToSetMap.get(v.id)?.title || versionToSetMap.get(v.id)?.name || 'Unknown Set'}
                                    </h4>
                                    <p className="text-sm text-slate-300 line-clamp-3 font-medium">
                                        {v?.promptText || `Iteration #${v?.versionNumber || v?.id?.substring(0, 4)}`}
                                    </p>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                                    <span className="text-xs text-slate-500">
                                        {new Date(v.createdAt).toLocaleDateString()}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCopy(v);
                                            }}
                                            className="text-slate-400 hover:text-indigo-400 transition-colors p-1"
                                            title="Copy to Media"
                                        >
                                            {copyingIds.has(v.id) ? (
                                                <CheckCircle size={16} className="animate-pulse text-indigo-500" />
                                            ) : (
                                                <Copy size={16} />
                                            )}
                                        </button>
                                        <button className="text-indigo-400 hover:text-indigo-300 transition-colors">
                                            <ExternalLink size={16} />
                                        </button>
                                    </div>
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
                                        {s?.title || s?.name || `Set: ${s?.id?.substring(0, 8)}...`}
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

                {!loading && (activeTab === 'iterations' ? processedVersions : filteredSets).length === 0 && (
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
                                    {selectedSet.title || selectedSet.name || `Set: ${selectedSet.id.substring(0, 8)}...`}
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
            {isResolvingConflicts && conflictQueue.length > 0 && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200 ring-1 ring-slate-700">
                        <div className="flex items-center gap-4 text-amber-500">
                            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Duplicate Check</h3>
                                <p className="text-slate-400 text-sm">Target media already exists.</p>
                            </div>
                        </div>

                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 space-y-3">
                            <div className="aspect-video relative rounded-lg overflow-hidden bg-black/50 border border-slate-700/50">
                                <img
                                    src={conflictQueue[0].version.imageUrl}
                                    className="w-full h-full object-contain"
                                    alt="Conflict Check"
                                />
                                <div className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded text-xs text-white font-mono border border-white/10">
                                    New Version
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 font-mono text-center">
                                ID: {conflictQueue[0].version.id}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => resolveConflict('replace', false)}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
                            >
                                <RefreshCw size={18} />
                                <span>Replace</span>
                            </button>
                            <button
                                onClick={() => resolveConflict('replace', true)}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition-colors border border-slate-600"
                            >
                                <span className="text-xs">Replace All</span>
                            </button>

                            <button
                                onClick={() => resolveConflict('skip', false)}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors border border-slate-700"
                            >
                                <SkipForward size={18} />
                                <span>Skip</span>
                            </button>
                            <button
                                onClick={() => resolveConflict('skip', true)}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg font-medium transition-colors border border-slate-700"
                            >
                                <span className="text-xs">Skip All</span>
                            </button>
                        </div>

                        <div className="text-center text-xs text-slate-500">
                            {conflictQueue.length} conflict{conflictQueue.length > 1 ? 's' : ''} remaining
                        </div>
                    </div>
                </div>
            )}

            {!permissionGranted && (
                <div className="fixed inset-0 z-40 bg-slate-950 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-8 shadow-2xl text-center space-y-6">
                        <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto border border-indigo-500/20">
                            <Layers size={40} className="text-indigo-500" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-white">Connect to Image Prompt Library</h2>
                            <p className="text-slate-400">
                                Access your hosted PromptVault collection. You need to explicitly grant permission to connect to the external API.
                            </p>
                        </div>

                        <div className="pt-4">
                            <button
                                onClick={handleGrantPermission}
                                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={20} />
                                <span>Connect & Sync</span>
                            </button>
                            <p className="text-xs text-slate-500 mt-4">
                                You can configure connection permissions in Settings.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PromptVault;
