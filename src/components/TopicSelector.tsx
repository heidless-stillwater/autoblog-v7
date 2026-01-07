import React, { useState } from 'react';
import { useStore } from '../store';
import { generateTopics } from '../services/aiService';
import { Zap, RefreshCcw, Sparkles } from 'lucide-react';

import TopicExplorer from './TopicExplorer';
import ConfirmModal from './ConfirmModal';

interface TopicSelectorProps {
    onSelectTopic: (topic: string) => void;
    selectedTopic?: string;
    topicQueue?: string[];
    onToggleTopic?: (topic: string) => void;
    onBulkToggleTopic?: (topics: string[], shouldSelect: boolean) => void;
}

const PRESET_SEEDS = [
    'Steampunk Technology',
    'Hard Science Fiction',
    'Cyberpunk Culture',
    'Retro Futurism',
    'Space Opera',
    'Artificial Intelligence Ethics',
    'Victorian Era Inventions',
    'Dystopian Societies'
];

const TopicSelector: React.FC<TopicSelectorProps> = ({
    onSelectTopic,
    selectedTopic,
    topicQueue,
    onToggleTopic,
    onBulkToggleTopic
}) => {
    const { settings, addTopicSet, topicSets, updateSettings } = useStore();
    const [seed, setSeed] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [showPresets, setShowPresets] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{
        message: string | React.ReactNode;
        onConfirm: () => void;
        onCancel?: () => void;
        confirmText?: string;
        cancelText?: string;
        showCancel?: boolean;
    } | null>(null);

    // Combine presets and user's custom seeds
    const allSeeds = Array.from(new Set([...PRESET_SEEDS, ...(settings.customSeeds || [])]));

    const handleGenerate = async () => {
        if (!seed.trim()) return;

        if (!settings.geminiApiKey) {
            setConfirmModal({
                message: 'Please configure your Gemini API Key in Settings first.',
                confirmText: 'Go to Settings',
                onConfirm: () => setConfirmModal(null),
                showCancel: false
            });
            return;
        }

        setConfirmModal({
            message: `Generate 5 new topics for "${seed}" using AI? This will consume credits.`,
            onConfirm: () => {
                setConfirmModal(null);
                performGenerate();
            },
            onCancel: () => setConfirmModal(null)
        });
    };

    const performGenerate = async () => {

        // Save as custom seed if not already in list
        if (!allSeeds.includes(seed)) {
            const newCustomSeeds = [...(settings.customSeeds || []), seed];
            await updateSettings({ customSeeds: newCustomSeeds });
        }

        setIsGenerating(true);
        try {
            const result = await generateTopics(seed, settings);

            if (result.error) {
                setConfirmModal({
                    message: `Error generating topics: ${result.error}`,
                    onConfirm: () => setConfirmModal(null),
                    showCancel: false
                });
            } else if (result.topics.length > 0) {
                await addTopicSet({
                    seed: seed,
                    topics: result.topics,
                    createdAt: Date.now(),
                    generatedBy: 'ai'
                });
            } else {
                setConfirmModal({
                    message: 'No topics generated.',
                    onConfirm: () => setConfirmModal(null),
                    showCancel: false
                });
            }
        } catch (error) {
            console.error('Generation failed:', error);
            setConfirmModal({
                message: 'Failed to generate topics.',
                onConfirm: () => setConfirmModal(null),
                showCancel: false
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRefresh = async () => {
        let targetSeed = seed;

        if (!targetSeed && selectedTopic) {
            const parentSet = topicSets.find(ts => ts.topics.includes(selectedTopic));
            if (parentSet) {
                targetSeed = parentSet.seed;
                setSeed(targetSeed);
            }
        }

        if (!targetSeed) {
            setConfirmModal({
                message: 'Please enter a seed or select a topic to refresh.',
                onConfirm: () => setConfirmModal(null),
                showCancel: false
            });
            return;
        }

        setConfirmModal({
            message: `Refresh topics for "${targetSeed}"? This will generate new topics and replace existing ones.`,
            onConfirm: () => {
                setConfirmModal(null);
                performRefresh(targetSeed);
            },
            onCancel: () => setConfirmModal(null)
        });
    };

    const performRefresh = async (targetSeed: string) => {

        setIsGenerating(true);
        try {
            const result = await generateTopics(targetSeed, settings);
            if (!result.error && result.topics.length > 0) {
                await addTopicSet({
                    seed: targetSeed,
                    topics: result.topics,
                    createdAt: Date.now(),
                    generatedBy: 'ai'
                });
            } else if (result.error) {
                setConfirmModal({
                    message: result.error,
                    onConfirm: () => setConfirmModal(null),
                    showCancel: false
                });
            }
        } catch (error) {
            console.error('Refresh failed:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleTopicClick = (topic: string) => {
        // "seed can also be chosen from the topics"
        // When clicking a topic, we want to:
        // 1. Select it (existing behavior)
        // 2. Populate the seed input with it (new requirement)
        setSeed(topic);
        onSelectTopic(topic);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="md:col-span-1">
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 h-full">
                    <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Sparkles size={16} className="text-amber-400" />
                        Topic Generator
                    </h3>

                    <div className="space-y-4">
                        <div className="relative">
                            <label className="block text-xs text-slate-500 mb-1">Topic Seed</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        value={seed}
                                        onChange={(e) => setSeed(e.target.value)}
                                        onFocus={() => setShowPresets(true)}
                                        placeholder="e.g. Steampunk"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                                    />
                                    {showPresets && (
                                        <div
                                            className="absolute z-50 mt-1 w-full md:w-64 max-h-48 overflow-y-auto bg-slate-800 border border-slate-700 rounded-lg shadow-xl"
                                            onMouseLeave={() => setShowPresets(false)}
                                        >
                                            {allSeeds.map(preset => (
                                                <div
                                                    key={preset}
                                                    onClick={() => {
                                                        setSeed(preset);
                                                        setShowPresets(false);
                                                    }}
                                                    className="px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 cursor-pointer"
                                                >
                                                    {preset}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || !seed}
                                className="btn-primary flex items-center justify-center gap-2 py-2 text-sm"
                            >
                                {isGenerating ? (
                                    <span className="animate-spin">⌛</span>
                                ) : (
                                    <Zap size={16} />
                                )}
                                Generate
                            </button>
                            <button
                                onClick={handleRefresh}
                                disabled={isGenerating || (!seed && !selectedTopic)}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors flex items-center justify-center gap-2 text-sm"
                            >
                                <RefreshCcw size={16} className={isGenerating ? "animate-spin" : ""} />
                                Refresh
                            </button>
                        </div>

                        <div className="text-xs text-slate-500 bg-slate-800/50 p-3 rounded border border-slate-800">
                            <strong>Tip:</strong> Choose a seed or enter your own, then click Generate to create topic ideas. <br />
                            <span className="opacity-75 mt-1 block">Clicking a topic in the explorer also selects it as a seed.</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="md:col-span-2">
                <TopicExplorer
                    onSelectTopic={handleTopicClick}
                    selectedTopic={selectedTopic}
                    topicQueue={topicQueue}
                    onToggleTopic={onToggleTopic}
                    onBulkToggleTopic={onBulkToggleTopic}
                />
            </div>
            {confirmModal && (
                <ConfirmModal
                    message={confirmModal.message}
                    onConfirm={confirmModal.onConfirm}
                    onCancel={confirmModal.onCancel}
                    confirmText={confirmModal.confirmText}
                    cancelText={confirmModal.cancelText}
                    showCancel={confirmModal.showCancel}
                />
            )}
        </div>
    );
};

export default TopicSelector;
