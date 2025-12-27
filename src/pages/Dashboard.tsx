import { useStore } from '../store';
import { Link } from 'react-router-dom';
import { Clock, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

const Dashboard = () => {
    const { posts, settings } = useStore();

    // Show all posts sorted by date descending (both live and draft)
    const allPosts = posts
        .sort((a, b) => b.createdAt - a.createdAt);

    const latestPost = allPosts[0];
    const recentPosts = allPosts.slice(1, 6); // Show 5 recent posts (excluding the latest)

    return (
        <div className="space-y-12">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-bold text-white mb-2">Welcome Back.</h1>
                <p className="text-slate-400">Manage your premium content for <span className="text-indigo-400 font-semibold">{settings.siteTitle}</span></p>
            </div>

            {/* Hero Section */}
            {latestPost ? (
                <section className="relative group rounded-2xl overflow-hidden aspect-[21/9] border border-slate-800 shadow-2xl">
                    {latestPost.heroImage ? (
                        <img
                            src={latestPost.heroImage}
                            alt={latestPost.title}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-slate-900" />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent flex flex-col justify-end p-8">
                        <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                            <div className="flex items-center gap-2 text-indigo-400 mb-2 font-medium">
                                <span className="px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/30 text-xs">Latest Post</span>
                                <span className={`px-2 py-0.5 rounded text-xs uppercase font-semibold ${latestPost.status === 'live'
                                    ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                                    : 'bg-amber-500/20 border border-amber-500/30 text-amber-400'
                                    }`}>
                                    {latestPost.status}
                                </span>
                                <span className="text-slate-400 text-sm flex items-center gap-1">
                                    <Clock size={14} />
                                    {format(latestPost.createdAt, 'MMM d, yyyy')}
                                </span>
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-3 line-clamp-1">{latestPost.title}</h2>
                            <p className="text-slate-300 line-clamp-2 max-w-2xl mb-6">{latestPost.excerpt || 'No excerpt available.'}</p>

                            <Link
                                to={`/posts/${latestPost.id}`}
                                className="inline-flex items-center gap-2 text-white bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 rounded-lg transition-all shadow-lg shadow-indigo-600/20"
                            >
                                Read Article <ArrowRight size={18} />
                            </Link>
                        </div>
                    </div>
                </section>
            ) : (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
                    <p className="text-slate-400 mb-4">No live posts yet. Start creating content!</p>
                    <Link to="/posts/new" className="btn-primary inline-flex items-center gap-2">
                        Create First Post
                    </Link>
                </div>
            )}

            {/* Recent Publications */}
            {recentPosts.length > 0 && (
                <section>
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        Recent Publications <span className="text-slate-500 text-sm font-normal">({recentPosts.length})</span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {recentPosts.map(post => (
                            <Link
                                key={post.id}
                                to={`/posts/${post.id}`}
                                className="group bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden hover:border-indigo-500/50 transition-all hover:-translate-y-1 block"
                            >
                                <div className="aspect-video bg-slate-800 overflow-hidden relative">
                                    {post.heroImage ? (
                                        <img
                                            src={post.heroImage}
                                            alt={post.title}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-slate-600">No Image</div>
                                    )}
                                </div>
                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-indigo-400 font-medium px-2 py-0.5 rounded bg-indigo-500/10">
                                                {post.tags?.[0] || 'Updates'}
                                            </span>
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded uppercase ${post.status === 'live'
                                                    ? 'bg-emerald-500/10 text-emerald-400'
                                                    : 'bg-amber-500/10 text-amber-400'
                                                }`}>
                                                {post.status}
                                            </span>
                                        </div>
                                        <span className="text-xs text-slate-500">{format(post.createdAt, 'MMM d')}</span>
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-200 group-hover:text-indigo-400 transition-colors line-clamp-1 mb-2">
                                        {post.title}
                                    </h4>
                                    <p className="text-sm text-slate-400 line-clamp-2">
                                        {post.excerpt || 'Click to read more...'}
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
