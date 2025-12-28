import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

const MarkdownRenderer = ({ content, className = '' }: MarkdownRendererProps) => {
    const components: Components = {
        table: ({ children }) => (
            <div className="not-prose my-8 overflow-x-auto rounded-xl border border-slate-800 shadow-2xl bg-slate-900/40">
                <table className="w-full border-collapse text-sm text-left">
                    {children}
                </table>
            </div>
        ),
        thead: ({ children }) => (
            <thead className="bg-slate-900 border-b border-slate-800 text-slate-200 uppercase tracking-wider text-xs">
                {children}
            </thead>
        ),
        tbody: ({ children }) => (
            <tbody className="divide-y divide-slate-800 bg-slate-900/40">
                {children}
            </tbody>
        ),
        th: ({ children }) => (
            <th className="px-6 py-4 font-bold border-r border-slate-800 last:border-0">
                {children}
            </th>
        ),
        td: ({ children }) => (
            <td className="px-6 py-4 text-slate-300 border-r border-slate-800 last:border-0">
                {children}
            </td>
        ),
        tr: ({ children }) => (
            <tr className="hover:bg-slate-800/30 transition-colors border-b border-slate-800/50 last:border-0">
                {children}
            </tr>
        ),
        h2: ({ children }) => <h2 className="text-2xl font-bold text-white mt-12 mb-6 border-l-4 border-indigo-500 pl-4">{children}</h2>,
        h3: ({ children }) => <h3 className="text-xl font-bold text-slate-100 mt-8 mb-4">{children}</h3>,
        p: ({ children }) => <p className="leading-relaxed mb-6 text-slate-300">{children}</p>,
        ul: ({ children }) => <ul className="list-disc list-outside ml-6 mb-6 space-y-2 text-slate-300">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-outside ml-6 mb-6 space-y-2 text-slate-300">{children}</ol>,
        li: ({ children }) => <li className="pl-2">{children}</li>,
        blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-slate-700 bg-slate-800/20 px-6 py-4 my-8 rounded-r-lg italic text-slate-400">
                {children}
            </blockquote>
        ),
        img: (props) => {
            const { src, alt } = props;
            if (!src) return null;
            return (
                <img
                    src={src}
                    alt={alt || ''}
                    className="w-full h-auto max-w-full rounded-lg my-6 border border-slate-800"
                />
            );
        },
    };

    return (
        <div className={`prose prose-invert prose-indigo max-w-none ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={components}
                urlTransform={(url) => url.startsWith('data:') ? url : url}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
};

export default MarkdownRenderer;
