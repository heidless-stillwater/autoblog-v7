import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AutoBlogGenerator from '../components/AutoBlogGenerator';
import TopicSelector from '../components/TopicSelector';
import { Sparkles, FileText, Zap } from 'lucide-react';

const TopicManager = () => {
    const navigate = useNavigate();
    const [view, setView] = useState<'topic-selection' | 'article-generation'>('topic-selection');
    const [selectedTopic, setSelectedTopic] = useState<string>();

    const handleTopicSelect = (topic: string) => {
        setSelectedTopic(topic);
        // Optionally jump to generation immediately
        // setView('article-generation'); 
    };

    const handleStartGeneration = () => {
        if (selectedTopic) {
            setView('article-generation');
        }
    };

    return (
        <div className="space-y-6 pb-20">
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
                    />

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
            ) : (
                <AutoBlogGenerator
                    onComplete={() => navigate('/admin/articles')}
                    initialTopic={selectedTopic}
                />
            )}
        </div>
    );
};

export default TopicManager;
