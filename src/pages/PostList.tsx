import { useState, useRef } from 'react';
import { useStore } from '../store';
import { Link } from 'react-router-dom';
import {
    FileEdit,
    Trash2,
    Search,
    Plus,
    Filter,
    Download,
    Upload,
    CheckSquare,
    Square
} from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';
import type { Post } from '../types';

const PostList = () => {
    const { posts, deletePost, importPosts } = useStore();
    const [filter, setFilter] = useState<'all' | 'live' | 'draft'>('all');
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const fileInputRef = useRef<HTMLInputElement>(null);

    const filteredPosts = posts
        .filter(post => {
            if (filter !== 'all' && post.status !== filter) return false;
            if (search && !post.title.toLowerCase().includes(search.toLowerCase())) return false;
            return true;
        })
        .sort((a, b) => b.updatedAt - a.updatedAt);

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const toggleAll = () => {
        if (selectedIds.size === filteredPosts.length && filteredPosts.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredPosts.map(p => p.id)));
        }
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this post?')) {
            deletePost(id);
            const newSelected = new Set(selectedIds);
            newSelected.delete(id);
            setSelectedIds(newSelected);
        }
    };

    // Backup: Download selected posts as JSON
    const handleBackup = () => {
        if (selectedIds.size === 0) return;

        const postsToBackup = posts.filter(p => selectedIds.has(p.id));
        const blob = new Blob([JSON.stringify(postsToBackup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup-posts-${format(new Date(), 'yyyy-MM-dd')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Restore: Upload JSON file
    const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = JSON.parse(event.target?.result as string);
                if (Array.isArray(importedData)) {
                    // Basic validation
                    const validPosts = importedData.filter((p: any) => p.id && p.title && p.content);
                    if (validPosts.length > 0) {
                        importPosts(validPosts as Post[]);
                        alert(`Successfully restored ${validPosts.length} posts.`);
                    } else {
                        alert('No valid posts found in file.');
                    }
                }
            } catch (err) {
                alert('Failed to parse backup file.');
            }
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold text-white">Posts</h1>
                <Link to="/posts/new" className="btn-primary flex items-center gap-2">
                    <Plus size={20} />
                    <span>New Post</span>
                </Link>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col xl:flex-row gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800 backdrop-blur-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                        type="text"
                        placeholder="Search posts..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input-field pl-10"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2">
                        <Filter className="text-slate-500 ml-2" size={18} />
                        <select
                            value={filter}
                            // @ts-ignore
                            onChange={(e) => setFilter(e.target.value)}
                            className="bg-transparent text-slate-300 py-2 px-2 outline-none appearance-none cursor-pointer text-sm"
                        >
                            <option value="all">All Status</option>
                            <option value="live">Live</option>
                            <option value="draft">Draft</option>
                        </select>
                    </div>

                    <div className="h-8 w-px bg-slate-800 mx-2 hidden md:block" />

                    <button
                        onClick={handleBackup}
                        disabled={selectedIds.size === 0}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 transition-colors text-sm"
                    >
                        <Download size={18} />
                        <span>Backup ({selectedIds.size})</span>
                    </button>

                    <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 cursor-pointer text-slate-300 transition-colors text-sm">
                        <Upload size={18} />
                        <span>Restore</span>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".json"
                            onChange={handleRestore}
                        />
                    </label>
                </div>
            </div>

            {/* List */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 px-5 text-slate-500 text-sm">
                    <button onClick={toggleAll} className="hover:text-white transition-colors">
                        {selectedIds.size === filteredPosts.length && filteredPosts.length > 0 ? (
                            <CheckSquare size={20} className="text-indigo-500" />
                        ) : (
                            <Square size={20} />
                        )}
                    </button>
                    <span>Select All</span>
                </div>

                {filteredPosts.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-xl">
                        No posts found matching your criteria.
                    </div>
                ) : (
                    filteredPosts.map(post => (
                        <div
                            key={post.id}
                            className={clsx(
                                "group flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 bg-slate-900/50 border rounded-xl transition-all",
                                selectedIds.has(post.id) ? "border-indigo-500/50 bg-indigo-500/5" : "border-slate-800 hover:border-slate-700 hover:bg-slate-900/80"
                            )}
                        >
                            <div className="flex items-start gap-4 w-full">
                                <button
                                    onClick={() => toggleSelection(post.id)}
                                    className="mt-1 text-slate-500 hover:text-indigo-400 transition-colors"
                                >
                                    {selectedIds.has(post.id) ? (
                                        <CheckSquare size={20} className="text-indigo-500" />
                                    ) : (
                                        <Square size={20} />
                                    )}
                                </button>

                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <div className={clsx(
                                            "w-2 h-2 rounded-full",
                                            post.status === 'live' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-amber-500"
                                        )} />
                                        <h3 className="text-lg font-semibold text-slate-200 group-hover:text-white transition-colors">
                                            {post.title}
                                        </h3>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                                        <span>{format(post.updatedAt, 'MMM d, yyyy')}</span>
                                        <span className="hidden sm:inline">•</span>
                                        <span className="capitalize px-2 py-0.5 rounded bg-slate-800 text-xs">{post.status}</span>
                                        {post.tags.length > 0 && (
                                            <>
                                                <span className="hidden sm:inline">•</span>
                                                <div className="flex gap-1">
                                                    {post.tags.slice(0, 3).map(tag => (
                                                        <span key={tag} className="text-indigo-400 text-xs">#{tag}</span>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 w-full md:w-auto justify-end pl-10 md:pl-0 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                <Link
                                    to={`/posts/${post.id}`}
                                    className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                                    title="Edit"
                                >
                                    <FileEdit size={18} />
                                </Link>
                                <button
                                    onClick={() => handleDelete(post.id)}
                                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default PostList;
