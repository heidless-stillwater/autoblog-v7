import { useEffect } from 'react';
import { useStore } from '../store';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Clock, ArrowRight, Heart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { PublicPost, Article } from '../types';

const FrontendBlogList = () => {
    const { publicContent, loadPublicContent, toggleFavorite, isLoading } = useStore();
    const { user } = useAuth();

    useEffect(() => {
        loadPublicContent();
    }, [loadPublicContent]);

    if (isLoading && publicContent.length === 0) {
        return (
            <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-500"></div>
            </div>
        );
    }

    const favorites = user?.favorites || [];

    // Helper to extract display data from any post type
    const getPostData = (post: PublicPost) => {
        const isArticle = (p: PublicPost): p is Article => 'topic' in p;

        if (isArticle(post)) {
            return {
                id: post.id,
                title: post.topic,
                image: post.heroImage,
                date: post.createdAt,
                link: `/article/${post.id}`
            };
        } else {
            // It's a Post
            return {
                id: post.id,
                title: post.title,
                image: post.heroImage,
                date: post.createdAt,
                link: `/article/${post.id}`
            };
        }
    };

    // Featured Post Data
    const featuredPost = publicContent.length > 0 ? getPostData(publicContent[0]) : null;

    return (
        <div className="space-y-12">
            {/* Hero Section (Latest Post) */}
            {featuredPost && (
                <section className="relative group rounded-2xl overflow-hidden aspect-[2/1] md:aspect-[2.5/1]">
                    {featuredPost.image && (
                        <div className="absolute inset-0">
                            <img
                                src={featuredPost.image}
                                alt={featuredPost.title}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
                        </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
                        <div className="max-w-3xl">
                            <span className="inline-block px-3 py-1 bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-full mb-4">
                                Featured
                            </span>
                            <Link to={featuredPost.link}>
                                <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight hover:text-indigo-300 transition-colors">
                                    {featuredPost.title}
                                </h1>
                            </Link>
                            <div className="flex items-center gap-6 text-slate-300 text-sm">
                                <span className="flex items-center gap-2">
                                    <Clock size={16} />
                                    {format(featuredPost.date, 'MMMM d, yyyy')}
                                </span>
                                {user && (
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            toggleFavorite(featuredPost.id);
                                        }}
                                        className={`flex items-center gap-2 transition-colors ${favorites.includes(featuredPost.id) ? 'text-red-500' : 'text-slate-400 hover:text-white'
                                            }`}
                                    >
                                        <Heart size={16} fill={favorites.includes(featuredPost.id) ? "currentColor" : "none"} />
                                        {favorites.includes(featuredPost.id) ? 'Favorited' : 'Add to Favorites'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* Articles Grid */}
            <section>
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold text-white">Latest Articles</h2>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {publicContent.slice(1).map(post => {
                        const data = getPostData(post);
                        return (
                            <article key={data.id} className="group bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden hover:border-indigo-500/50 transition-all hover:shadow-[0_0_30px_rgba(79,70,229,0.1)]">
                                {/* Image */}
                                <Link to={data.link} className="block relative aspect-video overflow-hidden bg-slate-800">
                                    {data.image ? (
                                        <img
                                            src={data.image}
                                            alt={data.title}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                                            No Image
                                        </div>
                                    )}
                                    {user && (
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                toggleFavorite(data.id);
                                            }}
                                            className="absolute top-3 right-3 p-2 bg-slate-950/50 backdrop-blur-sm rounded-full text-white hover:bg-white hover:text-red-500 transition-all border border-white/10"
                                        >
                                            <Heart size={16} fill={favorites.includes(data.id) ? "currentColor" : "none"} className={favorites.includes(data.id) ? "text-red-500" : ""} />
                                        </button>
                                    )}
                                </Link>

                                {/* Content */}
                                <div className="p-6">
                                    <div className="text-xs text-indigo-400 font-medium mb-2">
                                        {format(data.date, 'MMM d, yyyy')}
                                    </div>
                                    <Link to={data.link}>
                                        <h3 className="text-xl font-bold text-white mb-3 group-hover:text-indigo-400 transition-colors line-clamp-2">
                                            {data.title}
                                        </h3>
                                    </Link>
                                    <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
                                        <Link
                                            to={data.link}
                                            className="text-sm text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                                        >
                                            Read Article <ArrowRight size={14} />
                                        </Link>
                                    </div>
                                </div>
                            </article>
                        )
                    })}
                </div>

                {publicContent.length === 0 && !isLoading && (
                    <div className="text-center py-20 text-slate-500">
                        No published articles found.
                    </div>
                )}
            </section>
        </div>
    );
};

export default FrontendBlogList;
