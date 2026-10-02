import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/prism'

const MarkdownRenderer = ({ content = '' }) => {
    return (
        <div className="prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-100">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    h1: ({ node: _node, ...props }) => (
                        <h1 className="text-2xl md:text-3xl font-extrabold my-4 text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2" {...props} />
                    ),
                    h2: ({ node: _node, ...props }) => (
                        <h2 className="text-xl md:text-2xl font-bold my-3 text-slate-900 dark:text-white" {...props} />
                    ),
                    h3: ({ node: _node, ...props }) => (
                        <h3 className="text-lg md:text-xl font-bold my-2.5 text-slate-900 dark:text-white" {...props} />
                    ),
                    h4: ({ node: _node, ...props }) => (
                        <h4 className="text-base md:text-lg font-bold my-2 text-slate-900 dark:text-white" {...props} />
                    ),
                    p: ({ node: _node, ...props }) => (
                        <p className="my-2.5 leading-relaxed text-slate-700 dark:text-slate-200" {...props} />
                    ),
                    a: ({ node: _node, ...props }) => (
                        <a className="text-blue-600 dark:text-blue-400 hover:underline font-medium" {...props} />
                    ),
                    ul: ({ node: _node, ...props }) => (
                        <ul className="list-disc list-inside my-3 space-y-1.5 text-slate-700 dark:text-slate-200" {...props} />
                    ),
                    ol: ({ node: _node, ...props }) => (
                        <ol className="list-decimal list-inside my-3 space-y-1.5 text-slate-700 dark:text-slate-200" {...props} />
                    ),
                    li: ({ node: _node, ...props }) => (
                        <li className="ml-2 text-slate-700 dark:text-slate-200" {...props} />
                    ),
                    strong: ({ node: _node, ...props }) => (
                        <strong className="font-bold text-slate-900 dark:text-white" {...props} />
                    ),
                    em: ({ node: _node, ...props }) => (
                        <em className="italic text-slate-800 dark:text-slate-200" {...props} />
                    ),
                    blockquote: ({ node: _node, ...props }) => (
                        <blockquote className="border border-slate-200 px-4 py-3 italic bg-slate-50 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-200 my-4" {...props} />
                    ),
                    table: ({ node: _node, ...props }) => (
                        <div className="overflow-x-auto my-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm" {...props} />
                        </div>
                    ),
                    thead: ({ node: _node, ...props }) => (
                        <thead className="bg-slate-100 dark:bg-slate-800" {...props} />
                    ),
                    th: ({ node: _node, ...props }) => (
                        <th className="px-4 py-3 text-left font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800" {...props} />
                    ),
                    tbody: ({ node: _node, ...props }) => (
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900/90" {...props} />
                    ),
                    tr: ({ node: _node, ...props }) => (
                        <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors" {...props} />
                    ),
                    td: ({ node: _node, ...props }) => (
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-200 leading-normal border-b border-slate-100 dark:border-slate-800/80" {...props} />
                    ),
                    code: ({ node: _node, inline, className, children, ...props }) => {
                        const match = /language-(\w+)/.exec(className || '')
                        if (!inline && match) {
                            return (
                                <SyntaxHighlighter
                                    style={dracula}
                                    language={match[1]}
                                    PreTag="div"
                                    className="rounded-xl my-4 text-xs shadow-md"
                                    {...props}
                                >
                                    {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                            )
                        }
                        return (
                            <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md text-xs font-mono text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700" {...props}>
                                {children}
                            </code>
                        )
                    },
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    )
}

export default MarkdownRenderer
