import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../store';
import type { PublicPost, Article, Post } from '../types';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { format } from 'date-fns';
import { Clock, ArrowLeft, Share2, Heart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const FrontendArticleView = () => {
    const { id } = useParams<{ id: string }>();
    const { publicContent, loadPublicContent, toggleFavorite, isLoading } = useStore();
    const { user } = useAuth();
    const [post, setPost] = useState<PublicPost | null>(null);

    // Initial load if deep linking
    useEffect(() => {
        if (publicContent.length === 0) {
            loadPublicContent();
        }
    }, [loadPublicContent, publicContent.length]);

    // Find the post
    useEffect(() => {
        if (id && publicContent.length > 0) {
            const found = publicContent.find(p => p.id === id);
            setPost(found || null);
        }
    }, [id, publicContent]);

    if (isLoading && !post) {
        return (
            <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-500"></div>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold text-white mb-4">Article Not Found</h2>
                <Link to="/" className="text-indigo-400 hover:text-indigo-300">Back to Home</Link>
            </div>
        );
    }

    const favorites = user?.favorites || [];
    const isFavorited = id && favorites.includes(id);

    // Extraction Logic
    const isArticle = (p: PublicPost): p is Article => 'topic' in p;
    let title = '';
    let content = '';
    let image = post.heroImage;
    let date = post.createdAt;

    if (isArticle(post)) {
        title = post.topic;
        const currentVersion = post.versions.find(v => v.id === post.currentVersionId);
        content = currentVersion ? currentVersion.content : '';
    } else {
        // Post
        title = post.title;
        content = post.content;
    }

    return (
        <article className="max-w-4xl mx-auto">
            {/* Nav */}
            <div className="mb-8">
                <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-indigo-400 transition-colors">
                    <ArrowLeft size={20} />
                    Back to Articles
                </Link>
            </div>

            {/* Header */}
            <header className="mb-12 text-center">
                {image && (
                    <div className="rounded-2xl overflow-hidden aspect-video mb-8 border border-white/5 shadow-2xl">
                        <img
                            src={image}
                            alt={title}
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}

                <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
                    {title}
                </h1>

                <div className="flex items-center justify-center gap-6 text-slate-400">
                    <span className="flex items-center gap-2">
                        <Clock size={18} />
                        {format(date, 'MMMM d, yyyy')}
                    </span>

                    <div className="w-px h-4 bg-slate-700"></div>

                    <button className="flex items-center gap-2 hover:text-white transition-colors">
                        <Share2 size={18} />
                        Share
                    </button>

                    {user && id && (
                        <button
                            onClick={() => toggleFavorite(id)}
                            className={`flex items-center gap-2 transition-colors ${isFavorited ? 'text-red-500' : 'hover:text-white'}`}
                        >
                            <Heart size={18} fill={isFavorited ? "currentColor" : "none"} />
                            Favorite
                        </button>
                    )}
                </div>
            </header>

            {/* Content */}
            <div className="prose prose-invert prose-lg max-w-none">
                <MarkdownRenderer content={content} />
            </div>

            {/* Footer / Author section could go here */}
            <div className="mt-16 pt-8 border-t border-slate-800 text-center text-slate-500 text-sm">
                Thanks for reading!
            </div>
        </article>
    );
};

export default FrontendArticleView;
