import { useStore } from '../store';
import { Link } from 'react-router-dom';
import { Clock, ArrowRight, FileText, Sparkles } from 'lucide-react';
import { format } from 'date-fns';


import { useScheduledPublisher } from '../hooks/useScheduledPublisher';

const Dashboard = () => {
    const { posts, articles, settings } = useStore();

    // Enable client-side scheduled publishing (polls every 30s)
    useScheduledPublisher();

    // Stats
    const totalPosts = posts.length;
    const totalArticles = articles.length;
    const publishedArticles = articles.filter(a => a.status === 'published').length;
    const livePosts = posts.filter(p => p.status === 'live').length;

    // Unified Content Type for Display
    type DashboardItem = {
        id: string;
        type: 'post' | 'article';
        title: string;
        status: string;
        createdAt: number;
        excerpt?: string;
        heroImage?: string;
        link: string;
        tagLabel: string;
    };

    const unifiedPosts: DashboardItem[] = posts.map(p => ({
        id: p.id,
        type: 'post',
        title: p.title,
        status: p.status,
        createdAt: p.createdAt,
        excerpt: p.excerpt,
        heroImage: p.heroImage,
        link: `/admin/posts/${p.id}`,
        tagLabel: p.tags?.[0] || 'Post'
    }));

    const unifiedArticles: DashboardItem[] = articles.map(a => {
        // Find current version for excerpt/content if needed, simplified for now
        const currentVersion = a.versions.find(v => v.id === a.currentVersionId);
        const excerpt = currentVersion ? currentVersion.content.slice(0, 150) + '...' : '';

        return {
            id: a.id,
            type: 'article',
            title: a.topic, // Article uses topic as title
            status: a.status,
            createdAt: a.createdAt,
            excerpt: excerpt,
            heroImage: a.heroImage,
            link: `/admin/articles/${a.id}`,
            tagLabel: 'AutoBlog'
        };
    });

    // Merge and Sort
    const allContent = [...unifiedPosts, ...unifiedArticles].sort((a, b) => b.createdAt - a.createdAt);

    const latestItem = allContent[0];
    const recentItems = allContent.slice(1, 7); // Show 6 recent items

    return (
        <div className="space-y-12 pb-20">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-bold text-white mb-2">Welcome Back.</h1>
                <p className="text-slate-400">Manage your premium content for <span className="text-indigo-400 font-semibold">{settings.siteTitle}</span></p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                        <FileText size={16} />
                        <span className="text-sm font-medium">Total Posts</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{totalPosts}</div>
                    <div className="text-xs text-slate-500">{livePosts} Live</div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                        <Sparkles size={16} />
                        <span className="text-sm font-medium">Total Articles</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{totalArticles}</div>
                    <div className="text-xs text-slate-500">{publishedArticles} Published</div>
                </div>
            </div>

            {/* Hero Section */}
            {latestItem ? (
                <section className="relative group rounded-2xl overflow-hidden aspect-[21/9] border border-slate-800 shadow-2xl">
                    {latestItem.heroImage ? (
                        <img
                            src={latestItem.heroImage}
                            alt={latestItem.title}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-slate-900" />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent flex flex-col justify-end p-8">
                        <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                            <div className="flex items-center gap-2 text-indigo-400 mb-2 font-medium">
                                <span className="px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/30 text-xs">Latest {latestItem.type === 'post' ? 'Post' : 'Entry'}</span>
                                <span className={`px-2 py-0.5 rounded text-xs uppercase font-semibold ${(latestItem.status === 'live' || latestItem.status === 'published')
                                    ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                                    : 'bg-amber-500/20 border border-amber-500/30 text-amber-400'
                                    }`}>
                                    {latestItem.status}
                                </span>
                                <span className="text-slate-400 text-sm flex items-center gap-1">
                                    <Clock size={14} />
                                    {format(latestItem.createdAt, 'MMM d, yyyy')}
                                </span>
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-3 line-clamp-1">{latestItem.title}</h2>
                            <p className="text-slate-300 line-clamp-2 max-w-2xl mb-6">{latestItem.excerpt || 'No excerpt available.'}</p>

                            <Link
                                to={latestItem.link}
                                className="inline-flex items-center gap-2 text-white bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 rounded-lg transition-all shadow-lg shadow-indigo-600/20"
                            >
                                {latestItem.type === 'post' ? 'Edit Post' : 'Manage Article'} <ArrowRight size={18} />
                            </Link>
                        </div>
                    </div>
                </section>
            ) : (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
                    <p className="text-slate-400 mb-4">No content yet. Start creating!</p>
                    <div className="flex justify-center gap-4">
                        <Link to="/admin/posts/new" className="btn-primary inline-flex items-center gap-2">
                            New Post
                        </Link>
                        <Link to="/admin/topics" className="btn-secondary inline-flex items-center gap-2">
                            New Auto-Entry
                        </Link>
                    </div>
                </div>
            )}

            {/* Recent Publications */}
            {recentItems.length > 0 && (
                <section>
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        Recent Activity <span className="text-slate-500 text-sm font-normal">({recentItems.length})</span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {recentItems.map(item => (
                            <Link
                                key={item.id}
                                to={item.link}
                                className="group bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden hover:border-indigo-500/50 transition-all hover:-translate-y-1 block"
                            >
                                <div className="aspect-video bg-slate-800 overflow-hidden relative">
                                    {item.heroImage ? (
                                        <img
                                            src={item.heroImage}
                                            alt={item.title}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-slate-600">
                                            {item.type === 'article' ? <Sparkles size={24} /> : <FileText size={24} />}
                                        </div>
                                    )}
                                </div>
                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${item.type === 'article' ? 'bg-purple-500/10 text-purple-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                                                {item.tagLabel}
                                            </span>
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded uppercase ${(item.status === 'live' || item.status === 'published')
                                                ? 'bg-emerald-500/10 text-emerald-400'
                                                : 'bg-amber-500/10 text-amber-400'
                                                }`}>
                                                {item.status}
                                            </span>
                                        </div>
                                        <span className="text-xs text-slate-500">{format(item.createdAt, 'MMM d')}</span>
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-200 group-hover:text-indigo-400 transition-colors line-clamp-1 mb-2">
                                        {item.title}
                                    </h4>
                                    <p className="text-sm text-slate-400 line-clamp-2">
                                        {item.excerpt || 'Click to view...'}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};

export default Dashboard;
