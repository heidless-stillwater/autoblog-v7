import React, { useState } from 'react';
import { useStore } from '../store';
import { History as HistoryIcon, Trash2, ExternalLink, Clock, CheckCircle2, AlertCircle, Loader2, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';

const History: React.FC = () => {
    const { genHistory, deleteGenHistory, clearGenHistory } = useStore();
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isClearing, setIsClearing] = useState(false);
    const [sortMode, setSortMode] = useState<'manual' | 'alpha' | 'chrono'>('manual');
    const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void; onCancel?: () => void } | null>(null);

    const handleDelete = async (id: string) => {
        setConfirmModal({
            message: 'Are you sure you want to delete this history record?',
            onConfirm: async () => {
                setConfirmModal(null);
                setIsDeleting(id);
                try {
                    await deleteGenHistory(id);
                } catch (error) {
                    console.error('Failed to delete record:', error);
                    alert('Failed to delete record');
                } finally {
                    setIsDeleting(null);
                }
            }
        });
    };

    const handleClearHistory = async () => {
        setConfirmModal({
            message: 'Are you sure you want to delete ALL history records? This cannot be undone.',
            onConfirm: async () => {
                setConfirmModal(null);
                setIsClearing(true);
                try {
                    await clearGenHistory();
                } catch (error) {
                    console.error('Failed to clear history:', error);
                    alert('Failed to clear history');
                } finally {
                    setIsClearing(false);
                }
            }
        });
    };

    const getStatusIcon = (state: string) => {
        switch (state.toLowerCase()) {
            case 'completed':
                return <CheckCircle2 size={16} className="text-emerald-400" />;
            case 'processing':
                return <Loader2 size={16} className="text-amber-400 animate-spin" />;
            case 'pending':
                return <Clock size={16} className="text-slate-400" />;
            case 'error':
                return <AlertCircle size={16} className="text-red-400" />;
            default:
                return null;
        }
    };

    const getStatusStyle = (state: string) => {
        switch (state.toLowerCase()) {
            case 'completed':
                return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'processing':
                return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            case 'pending':
                return 'bg-slate-800 text-slate-400 border-slate-700';
            case 'error':
                return 'bg-red-500/10 text-red-400 border-red-500/20';
            default:
                return 'bg-slate-800 text-slate-400 border-slate-700';
        }
    };

    const toggleSort = () => {
        setSortMode(prev => {
            if (prev === 'manual') return 'alpha';
            if (prev === 'alpha') return 'chrono';
            return 'manual';
        });
    };

    const getDisplayHistory = () => {
        let display = [...genHistory];
        if (sortMode === 'alpha') {
            display.sort((a, b) => a.topicName.localeCompare(b.topicName));
        } else if (sortMode === 'chrono') {
            display.sort((a, b) => a.processDateTime - b.processDateTime);
        }
        return display;
    };

    const displayHistory = getDisplayHistory();

    return (
        <>
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                        <HistoryIcon size={16} className="text-indigo-400" />
                        Generation History
                    </h3>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest hidden sm:inline">
                            Total Records: {genHistory.length}
                        </span>
                        <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block"></div>

                        {genHistory.length > 0 && (
                            <button
                                onClick={handleClearHistory}
                                disabled={isClearing}
                                className="text-[10px] flex items-center gap-1 px-3 py-1.5 rounded font-bold uppercase transition-all border bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30"
                                title="Clear All History"
                            >
                                {isClearing ? (
                                    <Loader2 size={12} className="animate-spin" />
                                ) : (
                                    <Trash2 size={12} />
                                )}
                                Clear
                            </button>
                        )}

                        <button
                            onClick={toggleSort}
                            className={`text-[10px] flex items-center gap-1 px-3 py-1.5 rounded font-bold uppercase transition-all border ${sortMode !== 'manual'
                                ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                                : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
                                }`}
                            title={sortMode === 'alpha' ? "Sorted A-Z" : sortMode === 'chrono' ? "Sorted by Time" : "Manual Sort"}
                        >
                            <ArrowUpDown size={12} />
                            {sortMode === 'manual' ? 'Manual' : sortMode === 'alpha' ? 'A-Z' : 'Chrono'}
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950/50 border-b border-slate-800 text-slate-500 uppercase tracking-tighter font-black">
                            <tr>
                                <th className="px-4 py-3">Topic Set</th>
                                <th className="px-4 py-3">Topic</th>
                                <th className="px-4 py-3">State</th>
                                <th className="px-4 py-3 whitespace-nowrap">Last Update</th>
                                <th className="px-4 py-3">Article</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {displayHistory.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500 italic">
                                        No generation history found.
                                    </td>
                                </tr>
                            ) : (
                                displayHistory.map((record) => (
                                    <tr key={record.id} className="hover:bg-slate-800/30 transition-colors group">
                                        <td className="px-4 py-3">
                                            <span className="text-indigo-300 font-medium">{record.topicSetName}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-slate-300">{record.topicName}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${getStatusStyle(record.topicState)}`}>
                                                {getStatusIcon(record.topicState)}
                                                {record.topicState}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                                            {format(record.processDateTime, 'MMM d, HH:mm:ss')}
                                        </td>
                                        <td className="px-4 py-3">
                                            {record.topicArticleURL.toLowerCase() !== 'pending' ? (
                                                <a
                                                    href={record.topicArticleURL}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                                                >
                                                    View Article <ExternalLink size={12} />
                                                </a>
                                            ) : (
                                                <span className="text-slate-600 italic font-medium tracking-tight">Pending</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => handleDelete(record.id)}
                                                disabled={isDeleting === record.id}
                                                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                                title="Delete Record"
                                            >
                                                {isDeleting === record.id ? (
                                                    <Loader2 size={14} className="animate-spin" />
                                                ) : (
                                                    <Trash2 size={14} />
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
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
                                onClick={() => {
                                    if (confirmModal.onCancel) confirmModal.onCancel();
                                    setConfirmModal(null);
                                }}
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
        </>
    );
};

export default History;
