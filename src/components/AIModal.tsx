import { useState } from 'react';
import { Sparkles, X, Loader2 } from 'lucide-react';

interface AIModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (topic: string) => void;
    isLoading: boolean;
}

const AIModal = ({ isOpen, onClose, onGenerate, isLoading }: AIModalProps) => {
    const [topic, setTopic] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onGenerate(topic);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 shadow-2xl animate-scale-up">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Sparkles className="text-indigo-400" />
                        Generate with AI
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white" disabled={isLoading}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">
                            What should the post be about?
                        </label>
                        <textarea
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="E.g., The future of quantum computing, Top 10 heavy metal bands..."
                            className="input-field min-h-[100px] resize-none"
                            required
                        />
                    </div>

                    <div className="text-xs text-slate-500 bg-slate-900/50 p-3 rounded border border-slate-800">
                        Note: This will replace the current content in your editor. Ensure you have backed up any important work.
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !topic.trim()}
                            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="animate-spin" size={18} />
                                    <span>Researching...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles size={18} />
                                    <span>Generate</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AIModal;
