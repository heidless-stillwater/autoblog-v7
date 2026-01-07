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
    RefreshCw
} from 'lucide-react';
import clsx from 'clsx';
import ConfirmModal from '../components/ConfirmModal';

const Media = () => {
    const { media, addMedia, deleteMedia, posts } = useStore();
    const [search, setSearch] = useState('');
    const [dragActive, setDragActive] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);
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
        .filter(item => item.name.toLowerCase().includes(search.toLowerCase()))
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
                    size: 0 // Size unknown for existing images
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
                        size: 0
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
                        size: 0
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

    const handleUpload = async (files: FileList | null) => {
        if (!files) return;

        for (const file of Array.from(files)) {
            if (!file.type.startsWith('image/')) continue;

            const reader = new FileReader();
            reader.onload = async (e) => {
                await addMedia({
                    name: file.name,
                    type: file.type,
                    url: e.target?.result as string,
                    createdAt: Date.now(),
                    size: file.size
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleUpload(e.dataTransfer.files);
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

    const handleDownloadAll = () => {
        if (filteredMedia.length === 0) return;

        filteredMedia.forEach((item, index) => {
            setTimeout(() => {
                const link = document.createElement('a');
                link.href = item.url;
                link.download = item.name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }, index * 100); // Stagger downloads to avoid browser blocking
        });
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white">Media Library</h1>
                <div className="flex items-center gap-2">
                    <button
                        onClick={syncMediaFromPosts}
                        disabled={syncing}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors disabled:opacity-50"
                        title="Sync media from posts"
                    >
                        <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
                        <span className="hidden sm:inline">Sync from Posts</span>
                    </button>
                    <button
                        onClick={handleDownloadAll}
                        disabled={filteredMedia.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
                        title="Download all media"
                    >
                        <Download size={18} />
                        <span className="hidden sm:inline">Download All</span>
                    </button>
                </div>
            </div>

            {/* Upload Area */}
            <div
                className={clsx(
                    "relative border-2 border-dashed rounded-xl p-8 transition-all duration-300 flex flex-col items-center justify-center min-h-[200px] text-center",
                    dragActive
                        ? "border-indigo-500 bg-indigo-500/10 scale-[1.01]"
                        : "border-slate-700 bg-slate-900/30 hover:border-slate-600"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleUpload(e.target.files)}
                />

                <div className="bg-slate-800 p-4 rounded-full mb-4 ring-8 ring-slate-800/50">
                    <Upload className="text-indigo-400" size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Upload Files</h3>
                <p className="text-slate-400 max-w-sm mb-6">
                    Drag & drop images here or click to browse. Supported formats: JPG, PNG, WEBP.
                </p>
                <button
                    onClick={() => inputRef.current?.click()}
                    className="btn-primary"
                >
                    Select Files
                </button>
            </div>

            {/* Toolbar */}
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 backdrop-blur-sm flex items-center justify-between">
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
                <div className="text-slate-500 text-sm">
                    {filteredMedia.length} Items
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredMedia.map(item => (
                    <div
                        key={item.id}
                        className="group relative aspect-square bg-slate-900 border border-slate-800 rounded-lg overflow-hidden"
                    >
                        <img
                            src={item.url}
                            alt={item.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />

                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                            <p className="text-xs text-white truncate mb-1">{item.name}</p>
                            <p className="text-[10px] text-slate-400">
                                {item.size > 0 ? `${(item.size / 1024).toFixed(1)} KB • ` : ''}
                                {format(item.createdAt, 'MMM d')}
                            </p>
                        </div>

                        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={(e) => handleDownload(item, e)}
                                className="p-1.5 bg-black/50 hover:bg-black/70 rounded text-white backdrop-blur"
                                title="Download"
                            >
                                <Download size={14} />
                            </button>
                            <button
                                onClick={() => copyToClipboard(item.url, item.id)}
                                className="p-1.5 bg-black/50 hover:bg-black/70 rounded text-white backdrop-blur"
                                title="Copy URL"
                            >
                                {copiedId === item.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                            </button>
                            <button
                                onClick={(e) => handleDelete(item.id, e)}
                                className="p-1.5 bg-red-500/80 hover:bg-red-600 rounded text-white backdrop-blur"
                                title="Delete"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
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
        </div>
    );
};

export default Media;
