import React, { useState, useEffect } from 'react'
import {
    SplitSquareVertical,
    ArrowRightLeft,
    Sparkles,
    FileText,
    Loader2,
    Copy,
    Check,
    HelpCircle,
    Printer
} from 'lucide-react'
import PageHeader from '../../Components/common/PageHeader.jsx'
import Spinner from '../../Components/common/Spinner.jsx'
import MarkdownRenderer from '../../Components/common/MarkdownRenderer.jsx'
import documentService from '../../services/documentService.js'
import aiService from '../../services/aiService.js'
import toast from 'react-hot-toast'

const DocumentComparePage = () => {
    const [documents, setDocuments] = useState([])
    const [docId1, setDocId1] = useState('')
    const [docId2, setDocId2] = useState('')
    const [query, setQuery] = useState('')
    const [loading, setLoading] = useState(false)
    const [docsLoading, setDocsLoading] = useState(true)
    const [comparisonResult, setComparisonResult] = useState(null)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        const fetchDocs = async () => {
            try {
                setDocsLoading(true)
                const res = await documentService.getDocuments()
                const docs = res?.data || res || []
                const ready = docs.filter((d) => d.status === 'ready')
                setDocuments(ready)
                if (ready.length >= 2) {
                    setDocId1(ready[0]._id)
                    setDocId2(ready[1]._id)
                } else if (ready.length === 1) {
                    setDocId1(ready[0]._id)
                    setDocId2(ready[0]._id)
                }
            } catch (err) {
                toast.error('Failed to load documents')
            } finally {
                setDocsLoading(false)
            }
        }
        fetchDocs()
    }, [])

    const handleCompare = async (e) => {
        e.preventDefault()
        if (!docId1 || !docId2) {
            toast.error('Please select both documents to compare')
            return
        }

        setLoading(true)
        try {
            const res = await aiService.compareDocuments(docId1, docId2, query.trim())
            setComparisonResult(res.data)
            toast.success('Document comparison complete!')
        } catch (err) {
            console.error('Comparison error:', err)
            toast.error(err.message || 'Failed to compare documents')
        } finally {
            setLoading(false)
        }
    }

    const handleCopy = () => {
        if (!comparisonResult?.comparison) return
        navigator.clipboard.writeText(comparisonResult.comparison)
        setCopied(true)
        toast.success('Comparative report copied to clipboard!')
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="space-y-8">
            <PageHeader
                title="Document Comparison & Contrast"
                subtitle="Select two documents to generate a side-by-side comparative matrix, architectural trade-offs, and cross-document analysis."
            />

            {/* Selection & Query Card */}
            <form onSubmit={handleCompare} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] items-center gap-4">
                    {/* Document 1 Selector */}
                    <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Document A (Reference)
                        </label>
                        <select
                            value={docId1}
                            onChange={(e) => setDocId1(e.target.value)}
                            disabled={docsLoading}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-800 dark:text-slate-100"
                        >
                            {documents.map((d) => (
                                <option key={d._id} value={d._id} className="dark:bg-slate-900 dark:text-slate-100">
                                    {d.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Middle Icon */}
                    <div className="hidden md:flex h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 items-center justify-center shrink-0 mx-auto mt-6">
                        <ArrowRightLeft className="h-4 w-4" />
                    </div>

                    {/* Document 2 Selector */}
                    <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Document B (Target)
                        </label>
                        <select
                            value={docId2}
                            onChange={(e) => setDocId2(e.target.value)}
                            disabled={docsLoading}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-800 dark:text-slate-100"
                        >
                            {documents.map((d) => (
                                <option key={d._id} value={d._id} className="dark:bg-slate-900 dark:text-slate-100">
                                    {d.title}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Optional Specific Query */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Specific Comparison Focus or Question (Optional):
                    </label>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="e.g. Compare architectural complexity, efficiency, and real-world deployment cases..."
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600"
                    />
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={loading || docsLoading || documents.length === 0}
                        className="px-6 py-3 rounded-xl bg-slate-900   text-white font-bold text-xs shadow-sm hover: hover: transition flex items-center gap-2 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SplitSquareVertical className="h-4 w-4" />}
                        <span>{loading ? 'Synthesizing Comparison Matrix...' : 'Compare Both Documents'}</span>
                    </button>
                </div>
            </form>

            {/* Comparison Result Display */}
            {comparisonResult && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden animate-in fade-in zoom-in-95">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800 flex items-center justify-between">
                        <div>
                            <span className="text-xs uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-400">Analysis Matrix</span>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                                {comparisonResult.doc1.title} <span className="text-slate-400 dark:text-slate-500">vs</span> {comparisonResult.doc2.title}
                            </h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => window.print()}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-xs transition"
                                title="Export Comparison as PDF"
                            >
                                <Printer className="h-3.5 w-3.5" />
                                <span>Export PDF</span>
                            </button>
                            <button
                                onClick={handleCopy}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-xs transition"
                            >
                                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                                <span>{copied ? 'Copied' : 'Copy Report'}</span>
                            </button>
                        </div>
                    </div>

                    <div className="p-8 text-sm text-slate-800 dark:text-slate-100 leading-relaxed overflow-x-auto">
                        <MarkdownRenderer content={comparisonResult.comparison} />
                    </div>
                </div>
            )}
        </div>
    )
}

export default DocumentComparePage
