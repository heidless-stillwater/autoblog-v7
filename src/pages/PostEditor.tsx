import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store';
import type { Post } from '../types';
import { nanoid } from 'nanoid';
import { Save, Eye, ArrowLeft, Image as ImageIcon, Sparkles } from 'lucide-react';
import PostPreviewModal from '../components/PostPreviewModal';
import AIModal from '../components/AIModal';
import { generatePostContent } from '../services/aiService';
import clsx from 'clsx';

const PostEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { posts, addPost, updatePost } = useStore();

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [status, setStatus] = useState<'draft' | 'live'>('draft');
    const [tags, setTags] = useState('');
    const [heroImage, setHeroImage] = useState('');
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (id) {
            const post = posts.find(p => p.id === id);
            if (post) {
                setTitle(post.title);
                setContent(post.content);
                setStatus(post.status);
                setTags(post.tags.join(', '));
                setHeroImage(post.heroImage || '');
            } else {
                navigate('/admin/posts'); // Post not found
            }
        }
    }, [id, posts, navigate]);

    const handleSave = async (newStatus?: 'draft' | 'live') => {
        setIsSaving(true);
        // Simulate loading for loading progress requirement
        await new Promise(resolve => setTimeout(resolve, 800));

        const finalStatus = newStatus || status;
        const postData = {
            title,
            content,
            status: finalStatus,
            tags: tags.split(',').map(t => t.trim()).filter(Boolean),
            heroImage: heroImage || undefined,
            excerpt: content.slice(0, 150) + (content.length > 150 ? '...' : ''),
            attachments: [], // We don't have attachment logic yet in editor, but model requires it
        };

        if (id) {
            updatePost(id, postData);
        } else {
            const newPost: Post = {
                id: nanoid(),
                createdAt: Date.now(),
                updatedAt: Date.now(),
                ...postData
            };
            addPost(newPost);
            navigate(`/admin/posts/${newPost.id}`, { replace: true });
        }
        setIsSaving(false);
    };

    const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const imageUrl = reader.result as string;
                setHeroImage(imageUrl);

                // Also add to media library
                const { addMedia } = useStore.getState();
                await addMedia({
                    name: file.name,
                    type: file.type,
                    url: imageUrl,
                    createdAt: Date.now(),
                    size: file.size
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAIGenerate = async (topic: string) => {
        setIsGenerating(true);
        const currentSettings = useStore.getState().settings;

        const result = await generatePostContent(topic, currentSettings);

        setIsGenerating(false);
        if (result.error) {
            alert(result.error);
        } else {
            if (result.content && confirm('Content generated! Replace current editor content?')) {
                setContent(result.content);
                setTitle(prev => prev || `Post about ${topic}`);
                setIsAIModalOpen(false);
            }
        }
    };

    const confirmAI = () => {
        if (!useStore.getState().settings.perplexityApiKey) {
            alert('Please configure your Perplexity API Key in Settings first.');
            return;
        }
        setIsAIModalOpen(true);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between sticky top-0 bg-slate-950/80 backdrop-blur z-40 py-4 -mx-4 px-4 border-b border-slate-800/50">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-xl font-bold text-white truncate max-w-xs md:max-w-md">
                        {id ? 'Edit Post' : 'New Post'}
                    </h1>
                    <span className={clsx(
                        "px-2 py-0.5 text-xs rounded border uppercase font-medium",
                        status === 'live' ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" : "border-amber-500/30 text-amber-400 bg-amber-500/10"
                    )}>
                        {status}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsPreviewOpen(true)}
                        className="btn-secondary text-slate-300 hover:text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800 transition-colors"
                    >
                        <Eye size={18} />
                        <span className="hidden sm:inline">Preview</span>
                    </button>
                    <button
                        onClick={() => handleSave()}
                        disabled={isSaving}
                        className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save size={18} />
                        <span>{isSaving ? 'Saving...' : 'Save'}</span>
                    </button>
                </div>
            </div>

            {/* Main Form */}
            <div className="space-y-6">
                {/* Title Input */}
                <textarea
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Post Title"
                    className="w-full bg-transparent text-4xl font-bold text-white placeholder-slate-600 border-none outline-none resize-none overflow-hidden leading-tight"
                    rows={1}
                    style={{ height: 'auto', minHeight: '60px' }}
                    onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = target.scrollHeight + 'px';
                    }}
                />

                {/* Hero Image */}
                <div className="relative group rounded-xl overflow-hidden border-2 border-dashed border-slate-800 bg-slate-900/30 min-h-[160px] flex items-center justify-center transition-colors hover:border-indigo-500/50 hover:bg-slate-900/50">
                    {heroImage ? (
                        <>
                            <img src={heroImage} alt="Hero" className="w-full h-full object-cover max-h-[400px]" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <label className="cursor-pointer bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg backdrop-blur border border-white/20 transition-all">
                                    Change Cover
                                    <input type="file" className="hidden" accept="image/*" onChange={handleHeroImageUpload} />
                                </label>
                            </div>
                        </>
                    ) : (
                        <label className="cursor-pointer flex flex-col items-center gap-2 text-slate-500 hover:text-indigo-400 p-8 w-full h-full transition-colors">
                            <ImageIcon size={32} />
                            <span className="font-medium">Add Cover Image</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleHeroImageUpload} />
                        </label>
                    )}
                </div>

                {/* AI & Toolbar */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    <button
                        onClick={confirmAI}
                        className="flex items-center gap-2 text-sm text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-full border border-indigo-500/20 transition-all"
                    >
                        <Sparkles size={14} />
                        Generate with AI
                    </button>
                    {/* Tags Input */}
                    <input
                        type="text"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        placeholder="Tags (comma separated)..."
                        className="bg-transparent border-b border-slate-800 focus:border-indigo-500 text-sm py-1 px-2 w-full max-w-md outline-none transition-colors text-slate-300 placeholder-slate-600"
                    />
                    <select
                        value={status}
                        // @ts-ignore
                        onChange={(e) => setStatus(e.target.value)}
                        className="bg-transparent border-b border-slate-800 focus:border-indigo-500 text-sm py-1 px-2 outline-none text-slate-300 cursor-pointer"
                    >
                        <option value="draft">Draft</option>
                        <option value="live">Live</option>
                    </select>
                </div>

                {/* Markdown Editor */}
                <div className="min-h-[500px] relative">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Write your story..."
                        className="w-full h-full min-h-[500px] bg-transparent text-lg text-slate-300 placeholder-slate-700 outline-none resize-none font-mono leading-relaxed p-4"
                    />
                </div>
            </div>

            <PostPreviewModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                post={{ title, content, createdAt: Date.now(), tags: tags.split(','), heroImage }}
            />

            <AIModal
                isOpen={isAIModalOpen}
                onClose={() => setIsAIModalOpen(false)}
                onGenerate={handleAIGenerate}
                isLoading={isGenerating}
            />
        </div>
    );
};

export default PostEditor;
