import { X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format } from 'date-fns';
import type { Post } from '../types';

interface PostPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    post: Partial<Post>;
}

const PostPreviewModal = ({ isOpen, onClose, post }: PostPreviewModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-sm overflow-y-auto animate-fade-in">
            <div className="min-h-screen p-8 flex flex-col items-center">
                <button
                    onClick={onClose}
                    className="fixed top-6 right-6 p-2 bg-slate-900 rounded-full text-slate-400 hover:text-white border border-slate-800 hover:border-indigo-500 transition-all z-50 shadow-xl"
                >
                    <X size={24} />
                </button>

                <article className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl animate-scale-up">
                    {post.heroImage && (
                        <div className="w-full h-64 md:h-96 relative">
                            <img
                                src={post.heroImage}
                                alt={post.title}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-80" />
                        </div>
                    )}

                    <div className="p-8 md:p-12 relative">
                        <header className="mb-8">
                            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
                                {post.title || 'Untitled Post'}
                            </h1>
                            <div className="flex items-center gap-4 text-slate-400 text-sm">
                                <span>{post.createdAt ? format(post.createdAt, 'MMMM d, yyyy') : format(Date.now(), 'MMMM d, yyyy')}</span>
                                {post.tags && post.tags.length > 0 && (
                                    <>
                                        <span>•</span>
                                        <div className="flex gap-2">
                                            {post.tags.map(tag => (
                                                <span key={tag} className="text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </header>

                        <div className="prose prose-invert prose-indigo max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {post.content || ''}
                            </ReactMarkdown>
                        </div>
                    </div>
                </article>
            </div>
        </div>
    );
};

export default PostPreviewModal;
