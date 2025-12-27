import { useState } from 'react';
import { useStore } from '../store';
import { format } from 'date-fns';
import { Plus, Calendar, FileText, Clock, Trash2, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AutoBlogGenerator from '../components/AutoBlogGenerator';
import type { Article } from '../types';

const AutoBlog = () => {
    const { articles, deleteArticle, addPost } = useStore();
    const navigate = useNavigate();
    const [view, setView] = useState<'list' | 'create'>('list');

    const sortedArticles = [...articles].sort((a, b) => b.createdAt - a.createdAt);

    const handlePublish = (article: Article) => {
        // Convert Article to Post and publish
        const currentVersion = article.versions.find(v => v.id === article.currentVersionId);
        if (!currentVersion) return;

        addPost({
            id: article.id, // Reuse ID? or generate new one? Let's reuse for tracking
            title: `[Autoblog] ${article.topic}`, // Or parse title from markdown?
            content: currentVersion.content,
            status: 'draft', // User needs to approve first? Prompt said "state of draft so it can be approved"
            createdAt: Date.now(),
            updatedAt: Date.now(),
            tags: ['autoblog'],
            // user needs to add hero image manually or we could try to generate one in future
            attachments: [],
        });

        alert('Article draft created in Posts! You can now edit and publish it.');
        navigate(`/posts/${article.id}`);
    };

    return (
        <div className="space-y-8 pb-20">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <span className="bg-indigo-500/20 text-indigo-400 p-2 rounded-lg">
                        <FileText size={24} />
                    </span>
                    Autoblog
                </h1>

                {view === 'list' && (
                    <button
                        onClick={() => setView('create')}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus size={20} />
                        <span>New Auto-Entry</span>
                    </button>
                )}

                {view === 'create' && (
                    <button
                        onClick={() => setView('list')}
                        className="text-slate-400 hover:text-white"
                    >
                        Cancel
                    </button>
                )}
            </div>

            {view === 'create' ? (
                <AutoBlogGenerator onComplete={() => setView('list')} />
            ) : (
                <div className="grid gap-4">
                    {sortedArticles.length === 0 ? (
                        <div className="text-center py-20 bg-slate-900/30 border border-slate-800 rounded-xl border-dashed">
                            <FileText className="mx-auto text-slate-600 mb-4" size={48} />
                            <h3 className="text-xl font-medium text-white mb-2">No Articles Yet</h3>
                            <p className="text-slate-400 mb-6 max-w-sm mx-auto">
                                Use the AI agent to research and generate high-quality blog posts automatically.
                            </p>
                            <button
                                onClick={() => setView('create')}
                                className="btn-primary"
                            >
                                Start First Article
                            </button>
                        </div>
                    ) : (
                        sortedArticles.map(article => (
                            <div key={article.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-indigo-500/30 transition-colors group">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className="mt-1 p-2 bg-slate-800 rounded-lg text-slate-400">
                                            <FileText size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white mb-1 group-hover:text-indigo-400 transition-colors">
                                                {article.topic}
                                            </h3>
                                            <div className="flex items-center gap-4 text-xs text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <Clock size={12} />
                                                    Generated {format(article.createdAt, 'MMM d, h:mm a')}
                                                </span>
                                                {article.scheduleDate && (
                                                    <span className="flex items-center gap-1 text-amber-400">
                                                        <Calendar size={12} />
                                                        Scheduled: {format(article.scheduleDate, 'MMM d, h:mm a')}
                                                    </span>
                                                )}
                                                <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300 uppercase tracking-wider">
                                                    {article.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handlePublish(article)}
                                            className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 rounded-lg text-sm border border-indigo-500/20 transition-colors flex items-center gap-2"
                                        >
                                            <Edit size={14} />
                                            Open in Editor
                                        </button>
                                        <button
                                            onClick={() => deleteArticle(article.id)}
                                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default AutoBlog;
