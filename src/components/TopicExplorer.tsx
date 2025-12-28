import React, { useState } from 'react';
import { useStore } from '../store';
import { ChevronRight, ChevronDown, Folder, FileText, Download, Upload, Trash2 } from 'lucide-react';


interface TopicExplorerProps {
    onSelectTopic: (topic: string) => void;
    selectedTopic?: string;
}

const TopicExplorer: React.FC<TopicExplorerProps> = ({ onSelectTopic, selectedTopic }) => {
    const { topicSets, deleteTopicSet, importTopicSets } = useStore();
    const [expandedSeeds, setExpandedSeeds] = useState<Set<string>>(new Set());

    const toggleSeed = (seedId: string) => {
        const newExpanded = new Set(expandedSeeds);
        if (newExpanded.has(seedId)) {
            newExpanded.delete(seedId);
        } else {
            newExpanded.add(seedId);
        }
        setExpandedSeeds(newExpanded);
    };

    const handleBackup = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(topicSets, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `topic_sets_backup_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target?.result as string;
                const parsed = JSON.parse(content);
                if (Array.isArray(parsed)) {
                    await importTopicSets(parsed);
                    alert('Topic sets restored successfully!');
                } else {
                    alert('Invalid file format. Expected a JSON array.');
                }
            } catch (error) {
                console.error('Error importing:', error);
                alert('Failed to parse backup file.');
            }
        };
        reader.readAsText(file);
        // Reset input
        event.target.value = '';
    };

    if (topicSets.length === 0) {
        return (
            <div className="text-center py-8 text-slate-500 border border-slate-700/50 rounded-lg bg-slate-900/30 border-dashed">
                <Folder className="mx-auto mb-2 opacity-50" size={32} />
                <p>No topics generated yet.</p>
                <div className="mt-4 flex justify-center gap-2">
                    <label className="btn-secondary text-xs cursor-pointer flex items-center gap-1">
                        <Upload size={12} />
                        Restore Backup
                        <input
                            type="file"
                            accept=".json"
                            onChange={handleRestore}
                            className="hidden"
                        />
                    </label>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Folder size={16} className="text-indigo-400" />
                    Topic Sets
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleBackup}
                        className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition-colors"
                        title="Backup Topics"
                    >
                        <Download size={14} />
                    </button>
                    <label className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition-colors cursor-pointer" title="Restore Topics">
                        <Upload size={14} />
                        <input
                            type="file"
                            accept=".json"
                            onChange={handleRestore}
                            className="hidden"
                        />
                    </label>
                </div>
            </div>

            <div className="space-y-1 overflow-y-auto pr-2 custom-scrollbar flex-1 max-h-[400px]">
                {topicSets.map((ts) => (
                    <div key={ts.id} className="select-none">
                        <div
                            className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-slate-800/50 transition-colors group ${expandedSeeds.has(ts.id) ? 'text-indigo-300' : 'text-slate-400'
                                }`}
                        >
                            <span
                                onClick={() => toggleSeed(ts.id)}
                                className="p-0.5 hover:bg-slate-700 rounded"
                            >
                                {expandedSeeds.has(ts.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </span>
                            <span
                                onClick={() => toggleSeed(ts.id)}
                                className="flex-1 text-sm font-medium truncate"
                            >
                                {ts.seed} <span className="text-xs opacity-50">({ts.topics.length})</span>
                            </span>
                            <button
                                onClick={(e) => { e.stopPropagation(); deleteTopicSet(ts.id); }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-opacity"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>

                        {expandedSeeds.has(ts.id) && (
                            <div className="ml-6 space-y-0.5 mt-1 border-l-2 border-slate-800 pl-2">
                                {ts.topics.map((topic, idx) => (
                                    <div
                                        key={`${ts.id}-${idx}`}
                                        onClick={() => onSelectTopic(topic)}
                                        className={`px-2 py-1.5 rounded-md text-sm cursor-pointer transition-all flex items-center gap-2 ${selectedTopic === topic
                                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-300'
                                            }`}
                                    >
                                        <FileText size={12} className={selectedTopic === topic ? 'text-indigo-400' : 'opacity-50'} />
                                        <span className="truncate">{topic}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TopicExplorer;
