import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import AutoBlogGenerator from '../components/AutoBlogGenerator';
import TopicQueue from '../components/TopicQueue';
import TopicSelector from '../components/TopicSelector';
import { format } from 'date-fns';
import { Sparkles, FileText, Zap, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import TopicQueueProgress from '../components/TopicQueueProgress';
import type { LogEntry } from '../components/TopicQueueProgress';
import History from '../components/History';

const TopicManager = () => {
    const navigate = useNavigate();
    const {
        settings,
        updateSettings,
        articles,
        loadArticles,
        topicQueueSnapshots,
        loadTopicQueueSnapshots,
        saveTopicQueueSnapshot,
        updateTopicQueueSnapshot,
        deleteTopicQueueSnapshot,
        queueLogs,
        subscribeToQueueLogs,
        unsubscribeFromQueueLogs,
        topicSets,
        addGenHistory,
        updateGenHistory,
        loadGenHistory,
        genHistory
    } = useStore();

    // Default genDate to NOW in local YYYY-MM-DDTHH:mm format
    const [genDate, setGenDate] = useState<string>(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    });

    const [view, setView] = useState<'topic-selection' | 'article-generation' | 'batch-generation'>('topic-selection');
    const [selectedTopic, setSelectedTopic] = useState<string>();
    const [topicQueue, setTopicQueue] = useState<string[]>([]);
    const [batchProgress, setBatchProgress] = useState<{ current: number, total: number, status: string }>({ current: 0, total: 0, status: '' });
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [confirmModal, setConfirmModal] = useState<{ message: React.ReactNode; onConfirm: () => void; onCancel?: () => void } | null>(null);

    useEffect(() => {
        const load = async () => {
            await Promise.all([
                loadArticles(),
                loadTopicQueueSnapshots(),
                loadGenHistory()
            ]);
        };
        load();
        subscribeToQueueLogs();
        return () => unsubscribeFromQueueLogs();
    }, [loadArticles, loadTopicQueueSnapshots, loadGenHistory, subscribeToQueueLogs, unsubscribeFromQueueLogs]);

    // Load queue from settings on mount
    useEffect(() => {
        if (settings.topicQueue) {
            setTopicQueue(settings.topicQueue);
        }
    }, [settings.topicQueue]);

    // Update queue helper that also persists
    const updateQueue = async (newQueue: string[]) => {
        setTopicQueue(newQueue);
        await updateSettings({ topicQueue: newQueue });
    };

    // Toggle topic in the queue
    const handleToggleTopic = (topic: string) => {
        const newQueue = topicQueue.includes(topic)
            ? topicQueue.filter(t => t !== topic)
            : [...topicQueue, topic];

        updateQueue(newQueue);
    };

    // Bulk toggle topics
    const handleBulkToggleTopic = (topics: string[], shouldSelect: boolean) => {
        let newQueue = [...topicQueue];
        if (shouldSelect) {
            // Add all that aren't already there
            const toAdd = topics.filter(t => !newQueue.includes(t));
            newQueue = [...newQueue, ...toAdd];
        } else {
            // Remove all
            newQueue = newQueue.filter(t => !topics.includes(t));
        }
        updateQueue(newQueue);
    };

    // Remove from queue
    const handleRemoveFromQueue = (topic: string) => {
        updateQueue(topicQueue.filter(t => t !== topic));
    };

    // Reorder queue
    const handleReorderQueue = (newQueue: string[]) => {
        updateQueue(newQueue);
    };

    const handleSaveSnapshot = (queue: string[], name: string, genDate?: number) => {
        saveTopicQueueSnapshot(queue, name, genDate);
    };

    const handleUpdateSnapshot = (id: string, queue: string[]) => {
        updateTopicQueueSnapshot(id, queue);
    };

    const handleGenerateAll = async () => {
        if (topicQueue.length === 0) return;

        const topicsToGen = topicQueue.filter(topic => !articles.some(a => a.topic === topic));

        if (topicsToGen.length === 0) {
            alert('All topics in queue already have articles.');
            return;
        }

        setConfirmModal({
            message: `Generate ${topicsToGen.length} articles? This will take some time and use API credits.`,
            onConfirm: () => {
                setConfirmModal(null);
                proceedWithGeneration();
            }
        });
    };

    const proceedWithGeneration = async () => {
        const topicsToGen = topicQueue.filter(topic => !articles.some(a => a.topic === topic));

        setView('batch-generation');
        setBatchProgress({ current: 0, total: topicsToGen.length, status: 'Starting batch generation...' });
        setLogs([]); // Clear logs at start

        const genDateObj = new Date(genDate);
        if (genDateObj <= new Date()) {
            for (let i = 0; i < topicsToGen.length; i++) {
                const topic = topicsToGen[i];

                // Find topic set for history
                const topicSet = topicSets.find(ts => ts.topics.includes(topic));
                const topicSetName = topicSet ? topicSet.seed : 'Custom';

                // Check for existing history
                const existingHistory = genHistory.find(h => h.topicSetName === topicSetName && h.topicName === topic);

                if (existingHistory) {
                    const shouldRegenerate = await new Promise<boolean>((resolve) => {
                        setConfirmModal({
                            message: (
                                <div className="space-y-3">
                                    <p className="font-semibold text-slate-200">This topic has already been generated:</p>
                                    <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                                        <ul className="space-y-1.5 text-sm">
                                            <li className="flex gap-2">
                                                <span className="text-slate-500 w-12 shrink-0">Topic:</span>
                                                <span className="text-indigo-400 font-bold">{topic}</span>
                                            </li>
                                            <li className="flex gap-2">
                                                <span className="text-slate-500 w-12 shrink-0">Set:</span>
                                                <span className="text-slate-300">{topicSetName}</span>
                                            </li>
                                        </ul>
                                    </div>
                                    <p className="text-slate-400 text-sm">Do you want to regenerate it?</p>
                                </div>
                            ),
                            onConfirm: () => resolve(true),
                            onCancel: () => resolve(false)
                        });
                    });

                    if (!shouldRegenerate) {
                        const timestamp = format(new Date(), 'HH:mm:ss');
                        setLogs(prev => [...prev, {
                            topic,
                            timestamp,
                            status: 'skipped',
                            message: `you have chosen to skip the TOPIC:${topic} : ${timestamp}`
                        }]);
                        setBatchProgress(prev => ({
                            ...prev,
                            current: i + 1,
                            status: `Skipped ${topic} (Already Generated)`
                        }));

                        // Remove from queue since we processed (skipped) it
                        const currentQueue = useStore.getState().settings.topicQueue || [];
                        const updatedQueue = currentQueue.filter(t => t !== topic);
                        await updateQueue(updatedQueue);

                        await new Promise(resolve => setTimeout(resolve, 1000));
                        continue;
                    }
                }

                // Add history record
                const historyId = await addGenHistory({
                    topicSetName,
                    topicName: topic,
                    topicState: 'processing',
                    processDateTime: Date.now(),
                    topicArticleURL: 'pending'
                });

                // Add initial log entry
                const timestamp = format(new Date(), 'HH:mm:ss');
                setLogs(prev => [...prev, {
                    topic,
                    timestamp,
                    status: 'processing'
                }]);

                setBatchProgress(prev => ({
                    ...prev,
                    current: i + 1,
                    status: `Processing ${topic} : ${timestamp}`
                }));

                // 3-second pause as requested
                await new Promise(resolve => setTimeout(resolve, 3000));

                // Simulating processing complete
                setLogs(prev => prev.map(l => l.topic === topic ? { ...l, status: 'completed' } : l));

                // Update history record
                await updateGenHistory(historyId, {
                    topicState: 'completed',
                    processDateTime: Date.now(),
                    topicArticleURL: `/admin/articles/${topic.replace(/\s+/g, '-').toLowerCase()}` // Simulated link
                });

                // Remove from queue as requested
                const currentQueue = useStore.getState().settings.topicQueue || [];
                const updatedQueue = currentQueue.filter(t => t !== topic);
                await updateQueue(updatedQueue);
            }
        } else {
            setBatchProgress(prev => ({ ...prev, status: `Scheduled for ${format(genDateObj, 'MMM d, HH:mm')}` }));
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        setBatchProgress(prev => ({ ...prev, status: 'Batch generation complete!' }));
        setTimeout(() => setView('topic-selection'), 2000);
    };

    const handleLoadSnapshot = (snapshot: any) => {
        // Replace current queue logic
        updateQueue(snapshot.queue);
        // Also sync the genDate
        if (snapshot.genDate) {
            const d = new Date(snapshot.genDate);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            setGenDate(`${year}-${month}-${day}T${hours}:${minutes}`);
        }
    };

    const handleDeleteSnapshot = (id: string) => {
        deleteTopicQueueSnapshot(id);
    };

    const handleTopicDoubleClick = (topic: string) => {
        // Find if article exists
        const article = articles.find(a => a.topic === topic);
        if (article) {
            navigate(`/admin/articles/${article.id}`);
        } else {
            // If no article exists, we just select it for generation
            setSelectedTopic(topic);
            setView('article-generation');
        }
    };

    const handleTopicSelect = (topic: string) => {
        setSelectedTopic(topic);
    };

    const handleStartGeneration = () => {
        if (selectedTopic) {
            setView('article-generation');
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 pb-20">
            <div className="lg:col-span-3 space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <span className="bg-indigo-500/20 text-indigo-400 p-2 rounded-lg">
                            <Sparkles size={24} />
                        </span>
                        Topic Manager
                    </h1>

                    {view === 'article-generation' && (
                        <button
                            onClick={() => setView('topic-selection')}
                            className="text-slate-400 hover:text-white"
                        >
                            Back to Topics
                        </button>
                    )}
                </div>

                {view === 'topic-selection' ? (
                    <div className="space-y-6">
                        <TopicSelector
                            onSelectTopic={handleTopicSelect}
                            selectedTopic={selectedTopic}
                            topicQueue={topicQueue}
                            onToggleTopic={handleToggleTopic}
                            onBulkToggleTopic={handleBulkToggleTopic}
                        />

                        <div className="mt-6">
                            <TopicQueue
                                queue={topicQueue}
                                articles={articles}
                                onRemove={handleRemoveFromQueue}
                                onReorder={handleReorderQueue}
                                onTopicDoubleClick={handleTopicDoubleClick}
                                onGenerateAll={handleGenerateAll}
                                snapshots={topicQueueSnapshots}
                                onSaveSnapshot={handleSaveSnapshot}
                                onUpdateSnapshot={handleUpdateSnapshot}
                                onLoadSnapshot={handleLoadSnapshot}
                                onDeleteSnapshot={handleDeleteSnapshot}
                                genDate={genDate}
                                onGenDateChange={setGenDate}
                            />
                        </div>

                        <div className="mt-6">
                            <History />
                        </div>

                        {selectedTopic && (
                            <div className="bg-indigo-500/10 border border-indigo-500/20 p-6 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-indigo-500/20 rounded-full text-indigo-400">
                                        <FileText size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-medium text-white">Ready to Generate</h3>
                                        <p className="text-slate-400 text-sm">Target Topic: <span className="text-indigo-300 font-semibold">{selectedTopic}</span></p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleStartGeneration}
                                    className="btn-primary flex items-center gap-2 group"
                                >
                                    <Zap size={18} className="group-hover:text-yellow-300 transition-colors" />
                                    Generate Article
                                </button>
                            </div>
                        )}
                    </div>
                ) : view === 'article-generation' ? (
                    <AutoBlogGenerator
                        onComplete={() => navigate('/admin/articles')}
                        initialTopic={selectedTopic}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 space-y-8 animate-fade-in">
                        <div className="relative w-32 h-32">
                            <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
                            <div className="absolute inset-0 border-t-4 border-indigo-500 rounded-full animate-spin"></div>
                            <Sparkles className="absolute inset-0 m-auto text-indigo-400 animate-pulse" size={48} />
                        </div>

                        <div className="text-center space-y-4 max-w-lg w-full">
                            <h2 className="text-2xl font-bold text-white mb-2">Batch Generation in Progress</h2>
                            <div className="w-full bg-slate-800 rounded-full h-4 overflow-hidden border border-slate-700">
                                <div
                                    className="bg-indigo-500 h-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                                    style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between text-xs text-slate-500 font-mono">
                                <span>Processing {batchProgress.current} / {batchProgress.total}</span>
                                <span>{Math.round((batchProgress.current / batchProgress.total) * 100)}%</span>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 font-mono text-xs text-indigo-400 flex items-center gap-3">
                                <Loader2 className="animate-spin text-slate-500" size={14} />
                                <span className="truncate">{batchProgress.status}</span>
                            </div>
                        </div>

                        {batchProgress.current === batchProgress.total && batchProgress.total > 0 && (
                            <div className="flex items-center gap-2 text-emerald-400 font-bold animate-bounce mt-4">
                                <CheckCircle2 size={24} />
                                Success!
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="lg:col-span-1 h-[calc(100vh-120px)] sticky top-24">
                <TopicQueueProgress
                    logs={queueLogs.length > 0 ? queueLogs.map(l => ({
                        topic: l.topic,
                        timestamp: format(new Date(l.timestamp), 'HH:mm:ss'),
                        status: l.status
                    })) : logs}
                    isProcessing={view === 'batch-generation' || queueLogs.some(l => l.status === 'processing')}
                />
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
                                    <div className="text-sm text-slate-300">{confirmModal.message}</div>
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
        </div>
    );
};

export default TopicManager;
