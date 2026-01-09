import { useRef, useState, useEffect } from 'react';
import { useStore } from '../store';
import type { MediaItem } from '../types';
import { format } from 'date-fns';
import {
    Upload,
    Trash2,
    Search,
    Copy,
    Check,
    Download,
    RefreshCw,
    LayoutGrid,
    List,
    Tag,
    Plus,
    X,
    Settings as SettingsIcon,
    Filter
} from 'lucide-react';
import clsx from 'clsx';
import ConfirmModal from '../components/ConfirmModal';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Sparkles } from 'lucide-react';

const Media = () => {
    const { media, addMedia, updateMedia, deleteMedia, posts, mediaTags, addMediaTag, deleteMediaTag, updateMediaTag } = useStore();
    const [search, setSearch] = useState('');
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [tagManagerOpen, setTagManagerOpen] = useState(false);
    const [newItemTag, setNewItemTag] = useState<{ itemId: string; isOpen: boolean }>({ itemId: '', isOpen: false });

    // Selection State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // ZIP & Progress State
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState<{
        percent: number;
        message: string;
    } | null>(null);

    // Conflict Resolution State
    const [conflict, setConflict] = useState<{
        file: File;
        existing: MediaItem;
        onResolve: (action: 'replace' | 'skip', applyToAll: boolean) => void;
    } | null>(null);
    const [rememberedAction, setRememberedAction] = useState<'replace' | 'skip' | null>(null);

    const [confirmModal, setConfirmModal] = useState<{
        message: string | React.ReactNode;
        onConfirm: () => void;
        onCancel?: () => void;
        confirmText?: string;
        cancelText?: string;
        showCancel?: boolean;
    } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const filteredMedia = media
        .filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
            const matchesTag = !selectedTag || (item.tags && item.tags.includes(selectedTag));
            return matchesSearch && matchesTag;
        })
        .sort((a, b) => b.createdAt - a.createdAt);

    // Sync media from posts on mount
    useEffect(() => {
        syncMediaFromPosts();
    }, []);

    const syncMediaFromPosts = async () => {
        setSyncing(true);
        const existingUrls = new Set(media.map(m => m.url));
        const newMediaItems: Omit<MediaItem, 'id'>[] = [];

        posts.forEach(post => {
            // Extract hero image
            if (post.heroImage && !existingUrls.has(post.heroImage)) {
                newMediaItems.push({
                    name: `${post.title.substring(0, 30)}-hero.jpg`,
                    type: 'image/jpeg',
                    url: post.heroImage,
                    createdAt: post.createdAt,
                    size: 0, // Size unknown for existing images
                    tags: []
                });
                existingUrls.add(post.heroImage);
            }

            // Extract images from markdown content
            const imageRegex = /!\[.*?\]\((.*?)\)/g;
            let match;
            while ((match = imageRegex.exec(post.content)) !== null) {
                const imageUrl = match[1];
                if (!existingUrls.has(imageUrl)) {
                    newMediaItems.push({
                        name: `${post.title.substring(0, 30)}-content.jpg`,
                        type: 'image/jpeg',
                        url: imageUrl,
                        createdAt: post.createdAt,
                        size: 0,
                        tags: []
                    });
                    existingUrls.add(imageUrl);
                }
            }

            // Extract attachments
            post.attachments.forEach(attachment => {
                if (!existingUrls.has(attachment)) {
                    newMediaItems.push({
                        name: `${post.title.substring(0, 30)}-attachment`,
                        type: 'application/octet-stream',
                        url: attachment,
                        createdAt: post.createdAt,
                        size: 0,
                        tags: []
                    });
                    existingUrls.add(attachment);
                }
            });
        });

        // Add all new media items
        for (const item of newMediaItems) {
            await addMedia(item);
        }

        setSyncing(false);
    };

    const processFile = async (file: File | Blob, name: string) => {
        const existing = media.find(m => m.name === name);

        if (existing && !rememberedAction) {
            return new Promise<'replace' | 'skip'>(resolve => {
                setConflict({
                    file: file as File,
                    existing,
                    onResolve: (action, applyToAll) => {
                        if (applyToAll) setRememberedAction(action);
                        setConflict(null);
                        resolve(action);
                    }
                });
            });
        }

        const action = rememberedAction || 'replace';
        return action;
    };

    const saveMediaFile = async (file: File | Blob, name: string, type: string, action: 'replace' | 'skip') => {
        if (action === 'skip') return;

        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve) => {
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(file);
        });

        const existing = media.find(m => m.name === name);
        if (existing) {
            await updateMedia(existing.id, {
                url: dataUrl,
                size: file.size,
                type: type,
                createdAt: Date.now()
            });
        } else {
            await addMedia({
                name,
                type,
                url: dataUrl,
                createdAt: Date.now(),
                size: file.size,
                tags: []
            });
        }
    };

    const handleUpload = async (files: FileList | null) => {
        if (!files) return;
        setIsProcessing(true);
        setRememberedAction(null);
        const fileArray = Array.from(files);

        try {
            for (let i = 0; i < fileArray.length; i++) {
                const file = fileArray[i];

                if (file.name.endsWith('.zip')) {
                    setProgress({ percent: 0, message: `Extracting ${file.name}...` });
                    const zip = new JSZip();
                    const zipContent = await zip.loadAsync(file);
                    const zipFiles = Object.values(zipContent.files).filter(f => !f.dir && f.name.match(/\.(jpg|jpeg|png|webp|gif)$/i));

                    for (let j = 0; j < zipFiles.length; j++) {
                        const zf = zipFiles[j];
                        const blob = await zf.async('blob');
                        const progressPercent = Math.round((j / zipFiles.length) * 100);
                        setProgress({ percent: progressPercent, message: `Processing ${zf.name} from ZIP...` });

                        const action = await processFile(blob, zf.name); // simplified type detection
                        await saveMediaFile(blob, zf.name, 'image/jpeg', action);
                    }
                } else if (file.type.startsWith('image/')) {
                    const progressPercent = Math.round((i / fileArray.length) * 100);
                    setProgress({ percent: progressPercent, message: `Uploading ${file.name}...` });

                    const action = await processFile(file, file.name);
                    await saveMediaFile(file, file.name, file.type, action);
                }
            }
            setProgress({ percent: 100, message: 'Upload complete!' });
            setTimeout(() => setProgress(null), 2000);
        } catch (error) {
            console.error('Upload Error:', error);
            setConfirmModal({
                message: 'Error during upload. Some files may have failed.',
                onConfirm: () => setConfirmModal(null),
                showCancel: false
            });
        } finally {
            setIsProcessing(false);
            setRememberedAction(null);
        }
    };



    const copyToClipboard = (url: string, id: string) => {
        navigator.clipboard.writeText(url);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setConfirmModal({
            message: 'Delete this image?',
            confirmText: 'Delete',
            onConfirm: async () => {
                setConfirmModal(null);
                await deleteMedia(id);
            },
            onCancel: () => setConfirmModal(null)
        });
    };

    const handleDownload = (item: MediaItem, e: React.MouseEvent) => {
        e.stopPropagation();
        const link = document.createElement('a');
        link.href = item.url;
        link.download = item.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const toggleSelect = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredMedia.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredMedia.map(m => m.id)));
        }
    };

    const handleDownloadSelectedZip = async () => {
        const selectedMedia = media.filter(m => selectedIds.has(m.id));
        if (selectedMedia.length === 0) return;

        const timestamp = format(new Date(), 'yyyyMMdd-HHmm');
        const defaultName = `blog-media-collection-${timestamp}`;
        const fileName = prompt('Enter a name for your ZIP file:', defaultName);

        if (fileName === null) return; // Cancelled

        setIsProcessing(true);
        setProgress({ percent: 0, message: 'Initialising ZIP generator...' });

        try {
            const zip = new JSZip();
            const total = selectedMedia.length;

            for (let i = 0; i < selectedMedia.length; i++) {
                const item = selectedMedia[i];
                const progressPercent = Math.round((i / total) * 100);
                setProgress({
                    percent: progressPercent,
                    message: `Adding ${item.name} (${i + 1}/${total})...`
                });

                // Fetch the image data
                const response = await fetch(item.url);
                const blob = await response.blob();
                zip.file(item.name, blob);
            }

            setProgress({ percent: 95, message: 'Compressing files...' });
            const content = await zip.generateAsync({ type: 'blob' });

            setProgress({ percent: 100, message: 'Download ready!' });
            saveAs(content, `${fileName || defaultName}.zip`);

            setTimeout(() => setProgress(null), 2000);
        } catch (error) {
            console.error('ZIP Error:', error);
            setConfirmModal({
                message: 'Failed to create ZIP file. Some images might be inaccessible.',
                onConfirm: () => setConfirmModal(null),
                showCancel: false
            });
            setProgress(null);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteSelected = async () => {
        const selectedMedia = media.filter(m => selectedIds.has(m.id));
        if (selectedMedia.length === 0) return;

        setConfirmModal({
            message: `Are you sure you want to delete ${selectedMedia.length} selected item${selectedMedia.length > 1 ? 's' : ''}? This action cannot be undone.`,
            confirmText: 'Delete',
            onConfirm: async () => {
                setConfirmModal(null);
                setIsProcessing(true);
                setProgress({ percent: 0, message: 'Deleting items...' });

                try {
                    const total = selectedMedia.length;
                    for (let i = 0; i < selectedMedia.length; i++) {
                        const item = selectedMedia[i];
                        const progressPercent = Math.round(((i + 1) / total) * 100);
                        setProgress({
                            percent: progressPercent,
                            message: `Deleting ${item.name} (${i + 1}/${total})...`
                        });
                        await deleteMedia(item.id);
                    }

                    setProgress({ percent: 100, message: 'Deletion complete!' });
                    setTimeout(() => setProgress(null), 2000);
                    setSelectedIds(new Set()); // Clear selection
                } catch (error) {
                    console.error('Delete Error:', error);
                    setConfirmModal({
                        message: 'Error during deletion. Some items may not have been deleted.',
                        onConfirm: () => setConfirmModal(null),
                        showCancel: false
                    });
                    setProgress(null);
                } finally {
                    setIsProcessing(false);
                }
            },
            onCancel: () => setConfirmModal(null)
        });
    };

    const toggleItemTag = async (itemId: string, tag: string) => {
        const item = media.find(m => m.id === itemId);
        if (!item) return;

        const currentTags = item.tags || [];
        const newTags = currentTags.includes(tag)
            ? currentTags.filter(t => t !== tag)
            : [...currentTags, tag];

        await updateMedia(itemId, { tags: newTags });
    };

    return (
        <div className="space-y-6 pb-20 relative">
            {/* ZIP Progress */}
            {progress && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 w-full max-w-lg z-[100] px-4 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="bg-slate-900/95 backdrop-blur-xl border border-indigo-500/20 rounded-2xl p-4 shadow-2xl shadow-indigo-500/10">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-sm font-medium text-indigo-400 flex items-center gap-2">
                                <Sparkles size={16} className="animate-pulse" />
                                {progress.message}
                            </span>
                            <span className="text-xs font-mono text-slate-500">{Math.round(progress.percent)}%</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-indigo-600 to-violet-600 transition-all duration-500 ease-out"
                                style={{ width: `${progress.percent}%` }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Conflict Modal */}
            {conflict && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
                    <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6">
                        <h3 className="text-xl font-bold text-white mb-2">File Already Exists</h3>
                        <p className="text-slate-400 mb-6">
                            A file named <span className="text-indigo-400 font-mono">"{conflict.existing.name}"</span> already exists in your library.
                        </p>

                        <div className="flex gap-4 mb-6">
                            <div className="flex-1 text-center">
                                <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-bold">New File</p>
                                <div className="aspect-square rounded-lg bg-slate-800 overflow-hidden border border-slate-700">
                                    <img src={URL.createObjectURL(conflict.file)} alt="New" className="w-full h-full object-cover" />
                                </div>
                            </div>
                            <div className="flex-1 text-center">
                                <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-bold">Existing</p>
                                <div className="aspect-square rounded-lg bg-slate-800 overflow-hidden border border-slate-700">
                                    <img src={conflict.existing.url} alt="Existing" className="w-full h-full object-cover" />
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3 mb-2">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        id="apply-to-all"
                                        className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                                    />
                                    <span className="text-sm text-slate-400 group-hover:text-slate-300">Apply to remaining files</span>
                                </label>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        const applyToAll = (document.getElementById('apply-to-all') as HTMLInputElement)?.checked;
                                        conflict.onResolve('skip', applyToAll);
                                    }}
                                    className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                                >
                                    Skip
                                </button>
                                <button
                                    onClick={() => {
                                        const applyToAll = (document.getElementById('apply-to-all') as HTMLInputElement)?.checked;
                                        conflict.onResolve('replace', applyToAll);
                                    }}
                                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors font-bold"
                                >
                                    Replace
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white">Media Library</h1>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => inputRef.current?.click()}
                        disabled={isProcessing}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors disabled:opacity-50"
                        title="Upload images or ZIP"
                    >
                        <Upload size={18} />
                        <span className="hidden sm:inline">Upload</span>
                    </button>
                    <button
                        onClick={syncMediaFromPosts}
                        disabled={syncing || isProcessing}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors disabled:opacity-50"
                        title="Sync media from posts"
                    >
                        <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
                        <span className="hidden sm:inline">Sync from Posts</span>
                    </button>
                    {selectedIds.size > 0 && (
                        <>
                            <button
                                onClick={handleDownloadSelectedZip}
                                disabled={isProcessing}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 animate-in fade-in slide-in-from-right-4"
                                title="Download selected media as ZIP"
                            >
                                <Download size={18} />
                                <span className="hidden sm:inline">Download Selected ({selectedIds.size})</span>
                            </button>
                            <button
                                onClick={handleDeleteSelected}
                                disabled={isProcessing}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 animate-in fade-in slide-in-from-right-4"
                                title="Delete selected media"
                            >
                                <Trash2 size={18} />
                                <span className="hidden sm:inline">Delete Selected ({selectedIds.size})</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            <input
                ref={inputRef}
                type="file"
                multiple
                accept="image/*,.zip"
                className="hidden"
                onChange={(e) => handleUpload(e.target.files)}
            />

            {/* Toolbar */}
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 backdrop-blur-sm flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center gap-2 px-2 border-r border-slate-800 pr-4">
                        <input
                            type="checkbox"
                            checked={selectedIds.size === filteredMedia.length && filteredMedia.length > 0}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer"
                        />
                        <span className="text-sm text-slate-400 font-medium whitespace-nowrap">
                            {selectedIds.size > 0 ? `${selectedIds.size} Selected` : 'Select All'}
                        </span>
                    </div>
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search media..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="input-field pl-10"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3 p-1 bg-slate-800 rounded-lg">
                    <div className="flex items-center gap-2 px-2 border-r border-slate-700">
                        <Filter size={16} className="text-slate-500" />
                        <select
                            value={selectedTag || ''}
                            onChange={(e) => setSelectedTag(e.target.value || null)}
                            className="bg-transparent text-sm text-slate-300 focus:outline-none cursor-pointer pr-4"
                        >
                            <option value="" className="bg-slate-800 text-slate-200">All Tags</option>
                            {mediaTags.map(tag => (
                                <option key={tag} value={tag} className="bg-slate-800 text-slate-200">{tag}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={clsx(
                                "p-1.5 rounded-md transition-all",
                                viewMode === 'grid'
                                    ? "bg-indigo-600 text-white shadow-lg"
                                    : "text-slate-400 hover:text-slate-200"
                            )}
                            title="Grid View"
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={clsx(
                                "p-1.5 rounded-md transition-all",
                                viewMode === 'list'
                                    ? "bg-indigo-600 text-white shadow-lg"
                                    : "text-slate-400 hover:text-slate-200"
                            )}
                            title="List View"
                        >
                            <List size={18} />
                        </button>
                    </div>

                    <button
                        onClick={() => setTagManagerOpen(true)}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-md transition-all border-l border-slate-700 pl-2 ml-1"
                        title="Manage Tags"
                    >
                        <SettingsIcon size={18} />
                    </button>
                </div>

                <div className="text-slate-500 text-sm hidden lg:block">
                    {filteredMedia.length} Items
                </div>
            </div>

            {/* Content Area */}
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredMedia.map(item => (
                        <div
                            key={item.id}
                            onClick={() => toggleSelect(item.id)}
                            className={clsx(
                                "group relative aspect-square bg-slate-900 border rounded-lg cursor-pointer transition-all duration-300",
                                selectedIds.has(item.id) ? "border-indigo-500 ring-2 ring-indigo-500/50" : "border-slate-800 hover:border-slate-700"
                            )}
                        >
                            <div className="absolute inset-0 rounded-lg overflow-hidden">
                                <img
                                    src={item.url}
                                    alt={item.name}
                                    className={clsx(
                                        "w-full h-full object-cover transition-transform duration-500 group-hover:scale-110",
                                        selectedIds.has(item.id) && "scale-105 opacity-80"
                                    )}
                                />
                            </div>

                            {/* Selection Checkbox */}
                            <div className={clsx(
                                "absolute top-2 left-2 z-10 transition-all duration-300",
                                selectedIds.has(item.id) ? "opacity-100 scale-100" : "opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100"
                            )}>
                                <div className={clsx(
                                    "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                    selectedIds.has(item.id) ? "bg-indigo-600 border-indigo-500" : "bg-black/40 border-white/20 backdrop-blur"
                                )}>
                                    {selectedIds.has(item.id) && <Check size={12} className="text-white font-bold" />}
                                </div>
                            </div>

                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-b-lg">
                                <p className="text-xs text-white truncate mb-1">{item.name}</p>
                                <div className="flex flex-wrap gap-1 mb-2">
                                    {item.tags?.map(tag => (
                                        <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-indigo-500/30 text-indigo-300 rounded border border-indigo-500/20">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-[10px] text-slate-400">
                                    {item.size > 0 ? `${(item.size / 1024).toFixed(1)} KB • ` : ''}
                                    {format(item.createdAt, 'MMM d')}
                                </p>
                            </div>

                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="relative">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setNewItemTag({ itemId: item.id, isOpen: !newItemTag.isOpen || newItemTag.itemId !== item.id }); }}
                                        className="p-1.5 bg-black/60 hover:bg-black/80 rounded-lg text-white backdrop-blur shadow-lg border border-white/10"
                                        title="Tags"
                                    >
                                        <Tag size={14} />
                                    </button>
                                    {newItemTag.isOpen && newItemTag.itemId === item.id && (
                                        <div className="absolute right-0 top-full mt-2 w-56 bg-slate-800 border-2 border-slate-600 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] p-2 animate-in fade-in zoom-in-95 duration-200">
                                            <div className="max-h-64 overflow-y-auto space-y-1 custom-scrollbar">
                                                <div className="px-3 py-2 mb-1 border-b border-slate-700 flex justify-between items-center">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Tags</p>
                                                    <X size={10} className="text-slate-500 cursor-pointer hover:text-white" onClick={(e) => { e.stopPropagation(); setNewItemTag({ itemId: '', isOpen: false }); }} />
                                                </div>
                                                {mediaTags.map(tag => (
                                                    <button
                                                        key={tag}
                                                        onClick={(e) => { e.stopPropagation(); toggleItemTag(item.id, tag); }}
                                                        className={clsx(
                                                            "w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center justify-between font-bold",
                                                            item.tags?.includes(tag)
                                                                ? "bg-indigo-600 text-white ring-1 ring-indigo-400"
                                                                : "bg-slate-700/50 hover:bg-slate-600 text-slate-100"
                                                        )}
                                                    >
                                                        <span className="truncate">{tag}</span>
                                                        {item.tags?.includes(tag) && <Check size={12} className="shrink-0 ml-2" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDownload(item, e); }}
                                    className="p-1.5 bg-black/50 hover:bg-black/70 rounded text-white backdrop-blur"
                                    title="Download"
                                >
                                    <Download size={14} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); copyToClipboard(item.url, item.id); }}
                                    className="p-1.5 bg-black/50 hover:bg-black/70 rounded text-white backdrop-blur"
                                    title="Copy URL"
                                >
                                    {copiedId === item.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(item.id, e); }}
                                    className="p-1.5 bg-red-500/80 hover:bg-red-600 rounded text-white backdrop-blur"
                                    title="Delete"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-800 bg-slate-950/30">
                                    <th className="p-4 w-12">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.size === filteredMedia.length && filteredMedia.length > 0}
                                            onChange={toggleSelectAll}
                                            className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer"
                                        />
                                    </th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Preview</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Tags</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Details</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Date</th>
                                    <th className="p-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {filteredMedia.map(item => (
                                    <tr
                                        key={item.id}
                                        onClick={() => toggleSelect(item.id)}
                                        className={clsx(
                                            "group hover:bg-slate-800/30 transition-colors cursor-pointer",
                                            selectedIds.has(item.id) && "bg-indigo-500/5"
                                        )}
                                    >
                                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(item.id)}
                                                onChange={() => toggleSelect(item.id)}
                                                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer"
                                            />
                                        </td>
                                        <td className="p-4">
                                            <div className="w-10 h-10 rounded border border-slate-700 overflow-hidden bg-slate-800">
                                                <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-slate-200 truncate max-w-[200px] sm:max-w-xs">{item.name}</span>
                                                <span className="text-[10px] text-slate-500 md:hidden">
                                                    {item.size > 0 ? `${(item.size / 1024).toFixed(1)} KB` : ''} • {item.type.split('/')[1] || item.type}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 hidden md:table-cell">
                                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                {item.tags?.map(tag => (
                                                    <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 rounded border border-indigo-500/10">
                                                        {tag}
                                                    </span>
                                                ))}
                                                <div className="relative">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setNewItemTag({ itemId: item.id, isOpen: !newItemTag.isOpen || newItemTag.itemId !== item.id }); }}
                                                        className="p-1 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded transition-all"
                                                    >
                                                        <Plus size={12} />
                                                    </button>
                                                    {newItemTag.isOpen && newItemTag.itemId === item.id && (
                                                        <div className="absolute left-0 bottom-full mb-2 w-52 bg-slate-800 border-2 border-slate-600 rounded-xl shadow-2xl z-[100] p-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                                            <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar">
                                                                <div className="px-2 py-1.5 mb-1 border-b border-slate-700">
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Tags</p>
                                                                </div>
                                                                {mediaTags.map(tag => (
                                                                    <button
                                                                        key={tag}
                                                                        onClick={(e) => { e.stopPropagation(); toggleItemTag(item.id, tag); }}
                                                                        className={clsx(
                                                                            "w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center justify-between font-bold",
                                                                            item.tags?.includes(tag)
                                                                                ? "bg-indigo-600 text-white ring-1 ring-indigo-400"
                                                                                : "bg-slate-700/50 hover:bg-slate-600 text-slate-100"
                                                                        )}
                                                                    >
                                                                        <span className="truncate">{tag}</span>
                                                                        {item.tags?.includes(tag) && <Check size={12} className="shrink-0 ml-2" />}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 hidden lg:table-cell">
                                            <span className="text-xs text-slate-500 whitespace-nowrap">
                                                {format(item.createdAt, 'MMM d, yyyy')}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDownload(item, e); }}
                                                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors"
                                                    title="Download"
                                                >
                                                    <Download size={14} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); copyToClipboard(item.url, item.id); }}
                                                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors"
                                                    title="Copy URL"
                                                >
                                                    {copiedId === item.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(item.id, e); }}
                                                    className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {filteredMedia.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                    No media files found.
                </div>
            )}
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

            {/* Tag Manager Modal */}
            {tagManagerOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setTagManagerOpen(false)} />
                    <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Tag className="text-indigo-400" size={20} />
                                Manage Media Tags
                            </h3>
                            <button onClick={() => setTagManagerOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                            <form
                                onSubmit={async (e) => {
                                    e.preventDefault();
                                    const input = e.currentTarget.elements.namedItem('newTag') as HTMLInputElement;
                                    if (input.value.trim()) {
                                        await addMediaTag(input.value.trim());
                                        input.value = '';
                                    }
                                }}
                                className="flex gap-2"
                            >
                                <input
                                    name="newTag"
                                    type="text"
                                    placeholder="Add new tag..."
                                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                                />
                                <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg transition-colors">
                                    <Plus size={20} />
                                </button>
                            </form>

                            <div className="space-y-2">
                                {mediaTags.map(tag => (
                                    <div key={tag} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 group">
                                        <div className="flex items-center gap-3">
                                            <Tag size={14} className="text-slate-500" />
                                            <input
                                                type="text"
                                                defaultValue={tag}
                                                onBlur={async (e) => {
                                                    const newValue = e.target.value.trim();
                                                    if (newValue && newValue !== tag) {
                                                        await updateMediaTag(tag, newValue);
                                                    } else {
                                                        e.target.value = tag;
                                                    }
                                                }}
                                                className="bg-transparent text-sm text-slate-200 focus:outline-none focus:text-white"
                                            />
                                        </div>
                                        <button
                                            onClick={() => deleteMediaTag(tag)}
                                            className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-800 text-center">
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                                {mediaTags.length} Global Tags Active
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Media;
