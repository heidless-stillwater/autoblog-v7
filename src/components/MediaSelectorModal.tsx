import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Search, X, Image as ImageIcon, Check, Tag, ArrowUp, ArrowDown, ChevronDown, Target } from 'lucide-react';
import { clsx } from 'clsx';
import type { MediaItem } from '../types';

interface MediaSelectorModalProps {
    onSelect: (mediaItem: MediaItem, location: string, direction: 'above' | 'below') => void;
    onClose: () => void;
    content: string;
}

const MediaSelectorModal = ({ onSelect, onClose, content }: MediaSelectorModalProps) => {
    const { media, mediaTags, updateMedia } = useStore();
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [newItemTag, setNewItemTag] = useState<{ itemId: string; isOpen: boolean }>({ itemId: '', isOpen: false });
    const [selectedLocation, setSelectedLocation] = useState('cursor');
    const [selectedDirection, setSelectedDirection] = useState<'above' | 'below'>('below');

    const headers = useMemo(() => {
        const lines = content.split('\n');
        const h: { text: string; level: number }[] = [];
        lines.forEach(line => {
            const match = line.match(/^(#{1,3})\s+(.+)$/);
            if (match) {
                h.push({
                    level: match[1].length,
                    text: match[2].trim()
                });
            }
        });
        return h;
    }, [content]);

    const toggleItemTag = async (itemId: string, tag: string) => {
        const item = media.find(m => m.id === itemId);
        if (!item) return;

        const currentTags = item.tags || [];
        const newTags = currentTags.includes(tag)
            ? currentTags.filter(t => t !== tag)
            : [...currentTags, tag];

        await updateMedia(itemId, { tags: newTags });
    };

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
            onSelect(item, selectedLocation, selectedDirection);
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
                <div className="p-4 border-b border-slate-800 bg-slate-900/50 space-y-4">
                    <div className="flex flex-col md:flex-row gap-4 items-start">
                        <div className="flex-1 relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="text"
                                placeholder="Search images..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                                autoFocus
                            />
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <select
                                    value={selectedLocation}
                                    onChange={(e) => setSelectedLocation(e.target.value)}
                                    className="w-full appearance-none bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer font-medium hover:border-slate-600"
                                >
                                    <optgroup label="Selection">
                                        <option value="cursor">Insert at Cursor</option>
                                    </optgroup>
                                    <optgroup label="Fixed Locations">
                                        <option value="Hero Image">Hero Image</option>
                                        <option value="Top of Article">Top of Article</option>
                                        <option value="Bottom of Article">Bottom of Article</option>
                                    </optgroup>
                                    {headers.length > 0 && (
                                        <optgroup label="Section Headers">
                                            {headers.map((h, i) => (
                                                <option key={i} value={h.text}>
                                                    {'•'.repeat(h.level)} {h.text}
                                                </option>
                                            ))}
                                        </optgroup>
                                    )}
                                </select>
                                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                    <Target size={14} />
                                </div>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                    <ChevronDown size={14} />
                                </div>
                            </div>

                            <div className="flex bg-slate-950 border border-slate-700 rounded-lg p-1">
                                <button
                                    onClick={() => setSelectedDirection('above')}
                                    className={clsx(
                                        "p-1.5 rounded transition-all",
                                        selectedDirection === 'above' ? "bg-indigo-500 text-white" : "text-slate-500 hover:text-slate-300"
                                    )}
                                    title="Position Above"
                                >
                                    <ArrowUp size={14} />
                                </button>
                                <button
                                    onClick={() => setSelectedDirection('below')}
                                    className={clsx(
                                        "p-1.5 rounded transition-all",
                                        selectedDirection === 'below' ? "bg-indigo-500 text-white" : "text-slate-500 hover:text-slate-300"
                                    )}
                                    title="Position Below"
                                >
                                    <ArrowDown size={14} />
                                </button>
                            </div>
                        </div>
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
                                    className={clsx(
                                        "group relative aspect-square border rounded-lg cursor-pointer transition-all",
                                        selectedId === item.id
                                            ? 'border-indigo-500 ring-2 ring-indigo-500/50 scale-[1.02]'
                                            : 'border-slate-800 hover:border-slate-600 hover:scale-[1.02]'
                                    )}
                                >
                                    <div className="absolute inset-0 rounded-lg overflow-hidden" onClick={() => setSelectedId(item.id)}>
                                        <img
                                            src={item.url}
                                            alt={item.name}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                            <p className="text-xs text-white truncate w-full">{item.name}</p>
                                        </div>
                                    </div>

                                    {/* Tags Dropdown */}
                                    <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                        <div className="relative">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setNewItemTag({ itemId: item.id, isOpen: !newItemTag.isOpen || newItemTag.itemId !== item.id }); }}
                                                className="p-1 bg-black/60 hover:bg-black/80 rounded text-white backdrop-blur shadow-lg border border-white/10"
                                                title="Tags"
                                            >
                                                <Tag size={12} />
                                            </button>
                                            {newItemTag.isOpen && newItemTag.itemId === item.id && (
                                                <div className="absolute left-0 top-full mt-1 w-48 bg-slate-800 border-2 border-slate-600 rounded-lg shadow-2xl z-[100] p-1 animate-in fade-in zoom-in-95 duration-200">
                                                    <div className="max-h-40 overflow-y-auto space-y-0.5 custom-scrollbar">
                                                        {mediaTags.map(tag => (
                                                            <button
                                                                key={tag}
                                                                onClick={(e) => { e.stopPropagation(); toggleItemTag(item.id, tag); }}
                                                                className={clsx(
                                                                    "w-full text-left px-2 py-1.5 rounded text-[10px] transition-all flex items-center justify-between font-bold",
                                                                    item.tags?.includes(tag)
                                                                        ? "bg-indigo-600 text-white"
                                                                        : "bg-slate-700/50 hover:bg-slate-600 text-slate-100"
                                                                )}
                                                            >
                                                                <span className="truncate">{tag}</span>
                                                                {item.tags?.includes(tag) && <Check size={10} />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {selectedId === item.id && (
                                        <div className="absolute top-2 right-2 bg-indigo-500 text-white p-1 rounded-full shadow-lg z-10">
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
