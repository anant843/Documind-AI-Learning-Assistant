import React, { useState, useEffect } from 'react'
import { FileText, Copy, ClipboardCheck, X, BookMarked, BookOpen, Gauge, Calculator, HelpCircle, Printer } from 'lucide-react'
import MarkdownRenderer from '../common/MarkdownRenderer.jsx'
import Spinner from '../common/Spinner.jsx'
import aiService from '../../services/aiService.js'
import toast from 'react-hot-toast'

const StudyNotesModal = ({ isOpen, onClose, documentId, documentTitle }) => {
    const [activeTab, setActiveTab] = useState('short') // 'short', 'exam', 'revision', 'formulas', 'faqs'
    const [notes, setNotes] = useState(null)
    const [loading, setLoading] = useState(false)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        if (!isOpen || !documentId) return

        const fetchNotes = async () => {
            setLoading(true)
            try {
                const res = await aiService.generateNotes(documentId)
                setNotes(res?.data)
            } catch (err) {
                console.error('Error generating notes:', err)
                toast.error(err.message || 'Failed to generate study notes')
            } finally {
                setLoading(false)
            }
        }

        fetchNotes()
    }, [isOpen, documentId])

    if (!isOpen) return null

    const getContent = () => {
        if (!notes) return ''
        if (activeTab === 'short') return notes.shortNotes || 'No short notes available.'
        if (activeTab === 'exam') return notes.examNotes || 'No exam notes available.'
        if (activeTab === 'revision') return notes.revisionSheet || 'No revision sheet available.'
        if (activeTab === 'formulas') return notes.definitionsAndFormulas || 'No formulas or definitions available.'
        if (activeTab === 'faqs') return notes.examFaqs || 'No FAQs available.'
        return ''
    }

    const handleCopy = () => {
        const text = getContent()
        navigator.clipboard.writeText(text)
        setCopied(true)
        toast.success('Notes copied to clipboard!')
        setTimeout(() => setCopied(false), 2000)
    }

    const handlePrint = () => {
        window.print();
    }

    const tabs = [
        { id: 'short', label: 'Short Notes', icon: FileText },
        { id: 'exam', label: 'Exam High-Yield', icon: BookMarked },
        { id: 'revision', label: 'Rapid Revision', icon: Gauge },
        { id: 'formulas', label: 'Formulas & Definitions', icon: Calculator },
        { id: 'faqs', label: 'Exam FAQs', icon: HelpCircle },
    ];

    return (
        <div className="fixed inset-0 bg-slate-900/60  z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
                {/* Modal Header */}
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/90 no-print">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-slate-700 flex items-center justify-center">
                            <BookOpen className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg">AI Study Notes & Revision Suite</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-md">{documentTitle}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-xs"
                            title="Export to PDF / Print"
                        >
                            <Printer className="h-3.5 w-3.5" />
                            <span>Export PDF</span>
                        </button>
                        <button
                            onClick={handleCopy}
                            disabled={loading || !notes}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-xs disabled:opacity-50"
                        >
                            {copied ? <ClipboardCheck className="h-3.5 w-3.5 text-blue-500" /> : <Copy className="h-3.5 w-3.5" />}
                            <span>{copied ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="h-8 w-8 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* 5 Tabs Navigation */}
                <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-white dark:bg-slate-900 gap-2 overflow-x-auto no-print">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`py-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition flex items-center gap-1.5 ${
                                activeTab === tab.id
                                    ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            <tab.icon className="h-3.5 w-3.5" />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/40 dark:bg-slate-950/50">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
                            <Spinner size="lg" />
                            <p className="text-xs font-medium">Synthesizing comprehensive study notes, formulas & FAQs...</p>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs leading-relaxed text-sm text-slate-800 dark:text-slate-200 printable-card">
                            <MarkdownRenderer content={getContent()} />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 no-print">
                    <span>Generated with grounding from document context</span>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    )
}

export default StudyNotesModal
