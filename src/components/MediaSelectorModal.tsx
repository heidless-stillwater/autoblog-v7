import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Search, X, Image as ImageIcon, Check } from 'lucide-react';
import type { MediaItem } from '../types';

interface MediaSelectorModalProps {
    onSelect: (mediaItem: MediaItem) => void;
    onClose: () => void;
}

const MediaSelectorModal = ({ onSelect, onClose }: MediaSelectorModalProps) => {
    const { media } = useStore();
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const filteredMedia = useMemo(() => {
        return media
            .filter(item =>
                item.type.startsWith('image/') &&
                item.name.toLowerCase().includes(search.toLowerCase())
            )
            .sort((a, b) => b.createdAt - a.createdAt);
    }, [media, search]);

    const handleSelect = () => {
        const item = media.find(m => m.id === selectedId);
        if (item) {
            onSelect(item);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <ImageIcon className="text-indigo-400" size={24} />
                        Select Media
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search images..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto p-4 min-h-[400px]">
                    {filteredMedia.length === 0 ? (
                        <div className="text-center py-20 text-slate-500">
                            <ImageIcon size={48} className="mx-auto mb-4 opacity-50" />
                            <p>No images found matching your search.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {filteredMedia.map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => setSelectedId(item.id)}
                                    className={`group relative aspect-square border rounded-lg overflow-hidden cursor-pointer transition-all ${selectedId === item.id
                                            ? 'border-indigo-500 ring-2 ring-indigo-500/50 scale-[1.02]'
                                            : 'border-slate-800 hover:border-slate-600 hover:scale-[1.02]'
                                        }`}
                                >
                                    <img
                                        src={item.url}
                                        alt={item.name}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                        <p className="text-xs text-white truncate w-full">{item.name}</p>
                                    </div>
                                    {selectedId === item.id && (
                                        <div className="absolute top-2 right-2 bg-indigo-500 text-white p-1 rounded-full shadow-lg">
                                            <Check size={12} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/50 rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSelect}
                        disabled={!selectedId}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                    >
                        Insert Selected
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MediaSelectorModal;
