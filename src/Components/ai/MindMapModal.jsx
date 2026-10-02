import React, { useState, useEffect } from 'react'
import { X, ChevronRight, ChevronDown, Copy, ClipboardCheck, FolderTree } from 'lucide-react'
import { Skeleton } from '../common/LoadingState.jsx'
import aiService from '../../services/aiService.js'
import toast from 'react-hot-toast'

// Recursive tree node renderer
const MindMapNode = ({ node, depth = 0 }) => {
    const [expanded, setExpanded] = useState(true)
    const hasChildren = node.children && node.children.length > 0

    return (
        <div className={`space-y-2 ${depth > 0 ? 'ml-6 pl-4 border-l border-slate-200 dark:border-slate-700' : ''}`}>
            <div className="flex items-center gap-2 group">
                {hasChildren ? (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="h-6 w-6 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center transition shrink-0"
                    >
                        {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </button>
                ) : (
                    <div className="h-2 w-2 rounded-full bg-blue-500 ml-2 mr-2 shrink-0" />
                )}

                <div
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition ${
                        depth === 0
                            ? 'bg-slate-900   text-white text-sm py-2.5 px-4 shadow-md'
                            : depth === 1
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800/60'
                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500'
                    }`}
                >
                    {node.name}
                </div>
            </div>

            {hasChildren && expanded && (
                <div className="space-y-2 pt-1">
                    {node.children.map((child, idx) => (
                        <MindMapNode key={idx} node={child} depth={depth + 1} />
                    ))}
                </div>
            )}
        </div>
    )
}

const MindMapModal = ({ isOpen, onClose, documentId, documentTitle }) => {
    const [mindMapData, setMindMapData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        if (!isOpen || !documentId) return

        const fetchMindMap = async () => {
            setLoading(true)
            try {
                const res = await aiService.generateMindMap(documentId)
                setMindMapData(res?.data)
            } catch (err) {
                console.error('Mindmap generation error:', err)
                toast.error(err.message || 'Failed to generate mind map')
            } finally {
                setLoading(false)
            }
        }

        fetchMindMap()
    }, [isOpen, documentId])

    if (!isOpen) return null

    const formatAsMarkdownTree = (node, indent = '') => {
        let str = `${indent}├── ${node.name}\n`
        if (node.children) {
            node.children.forEach((c) => {
                str += formatAsMarkdownTree(c, indent + '│   ')
            })
        }
        return str
    }

    const handleCopy = () => {
        if (!mindMapData) return
        const text = formatAsMarkdownTree(mindMapData)
        navigator.clipboard.writeText(text)
        setCopied(true)
        toast.success('Mind map tree copied to clipboard!')
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="fixed inset-0 bg-slate-900/50  z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/90">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-slate-700 flex items-center justify-center">
                            <FolderTree className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Interactive Concept Mind Map</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-sm">{documentTitle}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCopy}
                            disabled={loading || !mindMapData}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-xs disabled:opacity-50"
                        >
                            {copied ? <ClipboardCheck className="h-3.5 w-3.5 text-blue-500" /> : <Copy className="h-3.5 w-3.5" />}
                            <span>{copied ? 'Copied' : 'Copy Tree'}</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="h-8 w-8 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Tree Visualization Area */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 dark:bg-slate-950/50">
                    {loading ? (
                        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900" aria-label="Building concept map">
                            <Skeleton className="h-5 w-2/5" />
                            <Skeleton className="ml-6 h-4 w-3/5" />
                            <Skeleton className="ml-6 h-4 w-1/2" />
                            <Skeleton className="ml-12 h-4 w-2/5" />
                        </div>
                    ) : mindMapData ? (
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                            <MindMapNode node={mindMapData} depth={0} />
                        </div>
                    ) : (
                        <p className="text-center text-xs text-slate-500 dark:text-slate-400 py-12">No mind map data available.</p>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Click on arrows to expand/collapse chapter branches</span>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}

export default MindMapModal
