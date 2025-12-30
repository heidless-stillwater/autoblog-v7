import React, { useState } from 'react';
import { Layers, X, Zap, Calendar, ArrowUpDown, GripVertical, Save, FolderOpen, Clock, Trash2, ChevronUp, ChevronDown, AlertCircle } from 'lucide-react';
import type { Article, TopicQueueSnapshot } from '../types';

export interface TopicQueueProps {
    queue: string[];
    articles?: Article[];
    onRemove: (topic: string) => void;
    onReorder?: (newQueue: string[]) => void;
    onTopicDoubleClick?: (topic: string) => void;
    onGenerateAll?: () => void;
    // Snapshot props
    onSaveSnapshot?: (queue: string[], name: string, genDate?: number) => void;
    onUpdateSnapshot?: (id: string, queue: string[], genDate?: number) => void;
    onLoadSnapshot?: (snapshot: TopicQueueSnapshot) => void;
    onDeleteSnapshot?: (id: string) => void;
    snapshots?: TopicQueueSnapshot[];
    // Controlled genDate
    genDate: string;
    onGenDateChange: (val: string) => void;
}

type SortMode = 'manual' | 'alpha' | 'chrono';

export default function TopicQueue({
    queue,
    articles = [],
    onRemove,
    onReorder,
    onTopicDoubleClick,
    onGenerateAll,
    onSaveSnapshot,
    onUpdateSnapshot,
    onLoadSnapshot,
    onDeleteSnapshot,
    snapshots = [],
    genDate,
    onGenDateChange
}: TopicQueueProps) {
    const [sortMode, setSortMode] = useState<SortMode>('manual');
    const [draggedItem, setDraggedItem] = useState<string | null>(null);
    const [showSnapshots, setShowSnapshots] = useState(false);
    const [snapshotLabel, setSnapshotLabel] = useState('backup');
    const [status, setStatus] = useState<{ type: 'success' | 'info' | 'error', msg: string } | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);

    const setTimedStatus = (msg: string, type: 'success' | 'info' | 'error' = 'success') => {
        setStatus({ msg, type });
        setTimeout(() => setStatus(null), 3000);
    };

    // Helper to get article info
    const getArticleInfo = (topic: string) => {
        const article = articles.find(a => a.topic === topic);
        if (!article) return null;

        let dateStr = '';
        if (article.status === 'scheduled' && article.scheduleDate) {
            dateStr = new Date(article.scheduleDate).toLocaleDateString();
        }

        return {
            status: article.status,
            date: dateStr,
            hasArticle: true
        };
    };

    // Calculate display queue based on sort
    const getDisplayQueue = () => {
        let display = [...queue];
        if (sortMode === 'alpha') {
            display.sort((a, b) => a.localeCompare(b));
        } else if (sortMode === 'chrono') {
            display.sort((a, b) => {
                const infoA = getArticleInfo(a);
                const infoB = getArticleInfo(b);

                // Get schedule dates or use a very large number for non-scheduled
                const dateA = infoA?.status === 'scheduled' ? new Date(articles.find(art => art.topic === a)?.scheduleDate || Infinity).getTime() : Infinity;
                const dateB = infoB?.status === 'scheduled' ? new Date(articles.find(art => art.topic === b)?.scheduleDate || Infinity).getTime() : Infinity;

                if (dateA !== dateB) return dateA - dateB;
                return a.localeCompare(b); // Fallback to alpha
            });
        }
        return display;
    };

    const displayQueue = getDisplayQueue();

    // Drag and Drop Handlers
    const handleDragStart = (e: React.DragEvent, topic: string) => {
        if (sortMode !== 'manual') return; // Only allow DND in manual mode
        setDraggedItem(topic);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, targetTopic: string) => {
        e.preventDefault();
        if (sortMode !== 'manual' || !draggedItem || draggedItem === targetTopic) return;
    };

    const handleDrop = (e: React.DragEvent, targetTopic: string) => {
        e.preventDefault();
        if (sortMode !== 'manual' || !draggedItem || draggedItem === targetTopic) return;

        const currentIndex = queue.indexOf(draggedItem);
        const targetIndex = queue.indexOf(targetTopic);

        if (currentIndex !== -1 && targetIndex !== -1) {
            const newQueue = [...queue];
            newQueue.splice(currentIndex, 1);
            newQueue.splice(targetIndex, 0, draggedItem);
            onReorder?.(newQueue);
        }
        setDraggedItem(null);
    };

    const toggleSort = () => {
        setSortMode(prev => {
            if (prev === 'manual') return 'alpha';
            if (prev === 'alpha') return 'chrono';
            return 'manual';
        });
    };

    const handleSaveSnapshot = () => {
        if (onSaveSnapshot && queue.length > 0) {
            const genDateMs = new Date(genDate).getTime();
            onSaveSnapshot(queue, snapshotLabel || 'backup', genDateMs);
            setTimedStatus('Snapshot saved');
        }
    };

    const addTimeOffset = (mins: number) => {
        // Parse the current genDate value
        const d = new Date(genDate);
        d.setMinutes(d.getMinutes() + mins);
        // Format to YYYY-MM-DDTHH:mm in LOCAL time for the input
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const formatted = `${year}-${month}-${day}T${hours}:${minutes}`;
        onGenDateChange(formatted);
        setTimedStatus(`${mins > 0 ? '+' : ''}${mins}m`, 'info');
    };

    const formatSnapshotDate = (ts: number) => {
        return new Date(ts).toLocaleString();
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-lg flex flex-col relative h-full overflow-hidden">
            {/* Status Bar */}
            <div className={`h-6 flex items-center justify-center text-[10px] font-bold uppercase tracking-wide transition-all duration-300 ${status
                ? (status.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                    status.type === 'error' ? 'bg-red-500/20 text-red-400' :
                        'bg-indigo-500/20 text-indigo-400')
                : 'bg-slate-900 border-b border-slate-800/50'
                }`}>
                <span className={`transition-opacity duration-300 ${status ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform -translate-y-2'}`}>
                    {status?.msg}
                </span>
            </div>

            <div className="p-4 flex flex-col h-full overflow-hidden">
                <div className="flex flex-row items-center justify-between gap-4 mb-4 border-b border-slate-800 pb-2 overflow-x-auto custom-scrollbar-hide shrink-0">
                    <div className="flex items-center gap-3 shrink-0">
                        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2 whitespace-nowrap">
                            <Layers size={16} className="text-indigo-400" />
                            Queue <span className="bg-indigo-500 text-white text-[10px] px-1.5 rounded-full">{queue.length}</span>
                        </h3>

                        <div className="h-4 w-px bg-slate-800 mx-1"></div>

                        {/* Snapshot Label Input */}
                        <div className="flex items-center gap-2 bg-slate-800/50 rounded px-2 py-1 border border-slate-700/50">
                            <span className="text-[8px] text-slate-500 uppercase font-black tracking-tighter">ID:</span>
                            <input
                                type="text"
                                value={snapshotLabel}
                                onChange={(e) => setSnapshotLabel(e.target.value)}
                                placeholder="Snapshot Label"
                                className="bg-transparent border-none text-xs text-indigo-300 focus:ring-0 p-0 w-20 font-bold outline-none placeholder:text-slate-600"
                            />
                        </div>

                        {/* GenDate Input & Quick Offsets */}
                        <div className="flex items-center gap-1.5 bg-slate-800/50 rounded px-2 py-1 border border-slate-700/50">
                            <span className="text-[8px] text-slate-500 uppercase font-black tracking-tighter">GenDate:</span>
                            <input
                                type="datetime-local"
                                value={genDate}
                                onChange={(e) => onGenDateChange(e.target.value)}
                                className="bg-transparent border-none text-[10px] text-indigo-300 focus:ring-0 p-0 w-[125px] font-bold outline-none"
                            />
                            <div className="flex gap-1 ml-1 border-l border-slate-700/50 pl-1.5 items-center">
                                {/* Combined Controls */}
                                <div className="flex flex-col gap-0.5">
                                    <button
                                        onClick={(e) => addTimeOffset(e.shiftKey ? 5 : 1)}
                                        className="text-slate-500 hover:text-indigo-400 bg-slate-700/30 px-1 rounded transition-colors leading-none"
                                        title="Add 1 min (Shift+Click for +5)"
                                    >
                                        <ChevronUp size={10} />
                                    </button>
                                    <button
                                        onClick={(e) => addTimeOffset(e.shiftKey ? -5 : -1)}
                                        className="text-slate-500 hover:text-indigo-400 bg-slate-700/30 px-1 rounded transition-colors leading-none"
                                        title="Sub 1 min (Shift+Click for -5)"
                                    >
                                        <ChevronDown size={10} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center bg-slate-800/30 rounded-lg p-0.5 border border-slate-800/50">
                        {onSaveSnapshot && (
                            <button
                                onClick={handleSaveSnapshot}
                                disabled={queue.length === 0}
                                className="p-1 px-2 text-slate-400 hover:text-emerald-400 transition-colors disabled:opacity-30"
                                title="Save Snapshot"
                            >
                                <Save size={16} />
                            </button>
                        )}

                        <div className="h-3 w-px bg-slate-700 mx-1"></div>

                        {onLoadSnapshot && (
                            <div className="">
                                <button
                                    onClick={() => setShowSnapshots(!showSnapshots)}
                                    className={`p-1 rounded transition-colors ${showSnapshots ? 'text-indigo-400' : 'text-slate-400 hover:text-indigo-400'}`}
                                    title="View Saved Snapshots"
                                >
                                    <FolderOpen size={16} />
                                </button>

                                {/* Snapshots Modal */}
                                {showSnapshots && (
                                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                                        <div
                                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300"
                                            onClick={() => setShowSnapshots(false)}
                                        />

                                        <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300">
                                            <div className="p-4 border-b border-slate-800 bg-slate-800/50 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                                                        <FolderOpen size={20} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Saved Snapshots</h3>
                                                        <p className="text-[10px] text-slate-500 font-medium">Reload a previously saved topic queue</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setShowSnapshots(false)}
                                                    className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700/50 rounded-full transition-all"
                                                >
                                                    <X size={18} />
                                                </button>
                                            </div>

                                            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3 custom-scrollbar">
                                                {snapshots.length === 0 ? (
                                                    <div className="text-sm text-slate-500 text-center py-12 bg-slate-950/30 rounded-xl border border-dashed border-slate-800 italic flex flex-col items-center gap-3">
                                                        <Clock size={32} className="opacity-20" />
                                                        No snapshots found
                                                    </div>
                                                ) : (
                                                    snapshots.map(snap => (
                                                        <div
                                                            key={snap.id}
                                                            className="flex flex-col bg-slate-800/30 p-4 rounded-xl hover:bg-slate-800/60 transition-all group border border-slate-700/30 hover:border-indigo-500/30 relative overflow-hidden"
                                                        >
                                                            <div className="flex items-center justify-between relative z-10">
                                                                <div
                                                                    className="flex-1 cursor-pointer min-w-0 pr-4"
                                                                    onClick={() => {
                                                                        setConfirmModal({
                                                                            message: `Load snapshot "${snap.id}"? This will replace your current queue.`,
                                                                            onConfirm: () => {
                                                                                onLoadSnapshot(snap);
                                                                                setShowSnapshots(false);
                                                                                setTimedStatus('Snapshot loaded');
                                                                                setConfirmModal(null);
                                                                            }
                                                                        });
                                                                    }}
                                                                >
                                                                    <div className="text-sm text-indigo-300 font-bold truncate tracking-tight mb-1">{snap.id}</div>
                                                                    <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                                                                        <Clock size={12} />
                                                                        {formatSnapshotDate(snap.createdAt)}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {onUpdateSnapshot && (
                                                                        <button
                                                                            onClick={() => {
                                                                                setConfirmModal({
                                                                                    message: 'Overwrite this snapshot with the current queue?',
                                                                                    onConfirm: () => {
                                                                                        const genDateMs = new Date(genDate).getTime();
                                                                                        onUpdateSnapshot(snap.id, queue, genDateMs);
                                                                                        setTimedStatus('Snapshot updated');
                                                                                        setShowSnapshots(false);
                                                                                        setConfirmModal(null);
                                                                                    }
                                                                                });
                                                                            }}
                                                                            className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
                                                                            title="Overwrite Snapshot"
                                                                        >
                                                                            <Zap size={14} />
                                                                        </button>
                                                                    )}
                                                                    {onDeleteSnapshot && (
                                                                        <button
                                                                            onClick={() => {
                                                                                setConfirmModal({
                                                                                    message: 'Delete this snapshot?',
                                                                                    onConfirm: () => {
                                                                                        onDeleteSnapshot(snap.id);
                                                                                        setTimedStatus('Snapshot deleted', 'info');
                                                                                        setConfirmModal(null);
                                                                                    }
                                                                                });
                                                                            }}
                                                                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                                                            title="Delete"
                                                                        >
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="mt-3 flex flex-wrap items-center gap-3 relative z-10">
                                                                <span className="bg-slate-900 px-2 py-0.5 rounded text-[10px] text-indigo-400 font-bold border border-slate-700 uppercase tracking-tighter">
                                                                    {snap.queue.length} topics
                                                                </span>
                                                                {snap.genDate && (
                                                                    <span className="bg-indigo-500/5 text-indigo-400 px-2 py-0.5 rounded text-[10px] border border-indigo-500/10 flex items-center gap-1">
                                                                        <Calendar size={10} />
                                                                        {new Date(snap.genDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                                    </span>
                                                                )}
                                                                {snap.status && (
                                                                    <span className={`px-2 py-0.5 rounded text-[10px] border uppercase font-black ${snap.status === 'completed'
                                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                                        : snap.status === 'processing'
                                                                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                                                                            : 'bg-slate-700/50 text-slate-500 border-slate-700'
                                                                        }`}>
                                                                        {snap.status}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>

                                            <div className="p-4 bg-slate-950 border-t border-slate-800/50 flex justify-between items-center text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                                                <span>Total Snapshots: {snapshots.length}</span>
                                                <button
                                                    onClick={() => setShowSnapshots(false)}
                                                    className="text-indigo-400 hover:text-indigo-300"
                                                >
                                                    Close
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="h-4 w-px bg-slate-700 mx-1"></div>

                    <button
                        onClick={toggleSort}
                        className={`text-[10px] flex items-center gap-1 px-3 py-1.5 rounded font-bold uppercase transition-all border ${sortMode !== 'manual'
                            ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                            : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
                            }`}
                        title={sortMode === 'alpha' ? "Sorted A-Z" : sortMode === 'chrono' ? "Sorted by Schedule" : "Manual Sort"}
                    >
                        <ArrowUpDown size={12} />
                        {sortMode === 'manual' ? 'Manual' : sortMode === 'alpha' ? 'A-Z' : 'Chrono'}
                    </button>

                    {onGenerateAll && (
                        <button
                            onClick={onGenerateAll}
                            disabled={queue.length === 0}
                            className="text-[10px] flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white px-3 py-1.5 rounded font-black uppercase tracking-wider shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50"
                        >
                            <Zap size={12} className="fill-current" />
                            Gen All
                        </button>
                    )}
                </div>
            </div>

            {queue.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 opacity-50 space-y-2 min-h-[200px]">
                    <Layers size={32} />
                    <p className="text-sm">Queue is empty</p>
                    <p className="text-xs">Select topics to add them here</p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar max-h-[400px]">
                    {displayQueue.map((topic) => {
                        const info = getArticleInfo(topic);
                        const isDraggable = sortMode === 'manual';

                        return (
                            <div
                                key={`${topic}`}
                                draggable={isDraggable}
                                onDragStart={(e) => handleDragStart(e, topic)}
                                onDragOver={(e) => handleDragOver(e, topic)}
                                onDrop={(e) => handleDrop(e, topic)}
                                onDoubleClick={() => onTopicDoubleClick?.(topic)}
                                className={`flex items-center justify-between bg-slate-800/50 p-2 rounded-md border border-slate-700/50 group transition-all select-none
                                    ${draggedItem === topic ? 'opacity-50 border-dashed border-indigo-500' : 'hover:border-indigo-500/30'}
                                    ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}
                                `}
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    {isDraggable && (
                                        <GripVertical size={14} className="text-slate-600 group-hover:text-slate-500" />
                                    )}

                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm text-slate-300 truncate font-medium" title={topic}>
                                            {topic}
                                        </span>
                                        {info && info.hasArticle && (
                                            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide mt-0.5">
                                                <span className={`
                                                    ${info.status === 'published' ? 'text-green-400' : ''}
                                                    ${info.status === 'scheduled' ? 'text-blue-400' : ''}
                                                    ${info.status === 'draft' ? 'text-amber-400' : ''}
                                                `}>
                                                    {info.status}
                                                </span>
                                                {info.status === 'scheduled' && info.date && (
                                                    <span className="flex items-center gap-1 text-slate-500">
                                                        <Calendar size={10} />
                                                        {info.date}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={() => onRemove(topic)}
                                    className="text-slate-500 hover:text-red-400 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-slate-700/50 ml-2"
                                    title="Remove from queue"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="mt-4 pt-2 border-t border-slate-800 text-xs text-slate-500 text-center flex justify-between items-center px-2">
                <span>{queue.length} topics</span>
                <span className="opacity-50">Double-click to edit</span>
            </div>

            {/* Confirmation Modal */}
            {confirmModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setConfirmModal(null)}
                    />
                    <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200">
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-amber-500/10 rounded-full text-amber-400 shrink-0">
                                    <AlertCircle size={24} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-white mb-2">Confirm Action</h3>
                                    <p className="text-sm text-slate-300">{confirmModal.message}</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex gap-3 justify-end">
                            <button
                                onClick={() => setConfirmModal(null)}
                                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmModal.onConfirm}
                                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
