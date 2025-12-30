import React, { useEffect, useRef } from 'react';
import { Terminal, Clock, CheckCircle2, Loader2 } from 'lucide-react';

export interface LogEntry {
    topic: string;
    timestamp: string;
    status: 'processing' | 'completed' | 'error';
}

interface TopicQueueProgressProps {
    logs: LogEntry[];
    isProcessing: boolean;
}

const TopicQueueProgress: React.FC<TopicQueueProgressProps> = ({ logs, isProcessing }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col h-full overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Terminal size={16} className="text-emerald-400" />
                    Queue Progress Log
                </h3>
                {isProcessing && (
                    <div className="flex items-center gap-2 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-full animate-pulse border border-emerald-500/20">
                        <Loader2 size={10} className="animate-spin" />
                        LIVE
                    </div>
                )}
            </div>

            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar font-mono text-xs"
            >
                {logs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50 space-y-2">
                        <Clock size={32} />
                        <p className="italic underline underline-offset-4 decoration-slate-800">Waiting for generation start...</p>
                    </div>
                ) : (
                    logs.map((log, idx) => (
                        <div
                            key={idx}
                            className={`p-3 rounded-lg border transition-all duration-300 animate-in fade-in slide-in-from-left-2 ${log.status === 'processing'
                                ? 'border-indigo-500/30 bg-indigo-500/5 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                                : 'border-slate-800 bg-slate-800/20 text-slate-400'
                                }`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                    <span className="text-slate-500 mr-2">[{log.timestamp}]</span>
                                    <span className="font-bold">Processing: </span>
                                    <span className={log.status === 'processing' ? 'text-white' : 'text-slate-300'}>
                                        {log.topic}
                                    </span>
                                </div>
                                {log.status === 'completed' ? (
                                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                                ) : (
                                    <Loader2 size={14} className="text-indigo-400 animate-spin shrink-0" />
                                )}
                            </div>
                            {log.status === 'processing' && (
                                <div className="mt-2 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 animate-progress-fast" />
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            <div className="p-3 bg-slate-950 border-t border-slate-800/50 text-[10px] text-slate-500 flex justify-between items-center">
                <span>Total Topics: {logs.length}</span>
                <span className="flex items-center gap-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${isProcessing ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`} />
                    {isProcessing ? 'Engine Active' : 'Engine Idle'}
                </span>
            </div>

            <style>{`
        @keyframes progress-fast {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .animate-progress-fast {
          animation: progress-fast 3s linear infinite;
        }
      `}</style>
        </div>
    );
};

export default TopicQueueProgress;
