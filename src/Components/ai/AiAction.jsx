import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    BookOpen,
    Lightbulb,
    Loader2,
    FileText,
    FolderTree,
    Target,
    ArrowRight,
    Presentation
} from 'lucide-react'
import aiService from '../../services/aiService.js'
import toast from 'react-hot-toast'
import MarkdownRenderer from '../common/MarkdownRenderer.jsx'
import Modal from '../common/Modal.jsx'
import StudyNotesModal from './StudyNotesModal.jsx'
import MindMapModal from './MindMapModal.jsx'
import PresentationModal from './PresentationModal.jsx'

const AiAction = ({ documentTitle }) => {
    const { id: documentId } = useParams()
    const navigate = useNavigate()
    const [loadingAction, setLoadingAction] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalContent, setModalContent] = useState('')
    const [modalTitle, setModalTitle] = useState('')
    const [concept, setConcept] = useState('')

    // Special Modals state
    const [isNotesModalOpen, setIsNotesModalOpen] = useState(false)
    const [isMindMapModalOpen, setIsMindMapModalOpen] = useState(false)
    const [isPresentationModalOpen, setIsPresentationModalOpen] = useState(false)

    const handleGenerateSummary = async () => {
        setLoadingAction('summary')
        try {
            const { summary } = await aiService.generateSummary(documentId)
            setModalTitle('Document Summary')
            setModalContent(summary)
            setIsModalOpen(true)
        } catch (error) {
            toast.error(error.message || 'Failed to generate summary')
        } finally {
            setLoadingAction(null)
        }
    }

    const handleExplainConcept = async (e) => {
        e.preventDefault()
        if (!concept.trim()) {
            toast.error('Please enter a concept to explain')
            return
        }
        setLoadingAction('explain')
        try {
            const { explanation } = await aiService.explainConcept(documentId, concept)
            setModalTitle(`Explanation: ${concept}`)
            setModalContent(explanation)
            setIsModalOpen(true)
            setConcept('')
        } catch (error) {
            toast.error(error.message || 'Failed to explain concept')
        } finally {
            setLoadingAction(null)
        }
    }

    const handleGenerateWeakTopicQuiz = async () => {
        setLoadingAction('weak-quiz')
        try {
            const res = await aiService.generateWeakTopicQuiz(documentId, 5)
            toast.success('Personalized Diagnostic Quiz ready!')
            navigate(`/quizzes/${res.data._id}`)
        } catch (error) {
            toast.error(error.message || 'Failed to generate weak topic quiz')
        } finally {
            setLoadingAction(null)
        }
    }

    return (
        <>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Study tools</h3>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Create focused learning material from this document.</p>
                    </div>
                </div>

                <div className="grid gap-px bg-slate-200 p-px dark:bg-slate-800 md:grid-cols-2">
                    {/* 1. PDF-to-Notes Card */}
                    <div className="rounded-xl border border-slate-200 dark:border-blue-500/20 bg-slate-50/70 dark:bg-slate-900 p-5 flex flex-col justify-between gap-4 hover:shadow-md dark:hover:border-blue-500/40 dark:shadow-slate-950/40 transition">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2.5">
                                <div className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                    <FileText className="h-4.5 w-4.5" />
                                </div>
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white">PDF-to-Notes Generator</h4>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                Automatically extract Short Notes, High-Yield Exam Notes, and a Rapid One-Page Revision Sheet.
                            </p>
                        </div>
                        <button
                            onClick={() => setIsNotesModalOpen(true)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-white text-xs font-semibold shadow-xs transition"
                        >
                            <span>Open Study Notes</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    {/* 2. PDF-to-Mind Map Card */}
                    <div className="rounded-xl border border-slate-200 dark:border-cyan-500/20 bg-slate-50/70 dark:bg-slate-900 p-5 flex flex-col justify-between gap-4 hover:shadow-md dark:hover:border-cyan-500/40 dark:shadow-slate-950/40 transition">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2.5">
                                <div className="h-9 w-9 rounded-xl bg-cyan-100 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                                    <FolderTree className="h-4.5 w-4.5" />
                                </div>
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white">PDF-to-Mind Map Tree</h4>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                Visualize core chapters, theorems, and sub-topics in an interactive collapsible tree structure.
                            </p>
                        </div>
                        <button
                            onClick={() => setIsMindMapModalOpen(true)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 px-4 py-2.5 text-white text-xs font-semibold shadow-xs transition"
                        >
                            <span>View Concept Mind Map</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    {/* PDF-to-Slide Deck Card */}
                    <div className="rounded-xl border border-slate-200 dark:border-purple-500/20 bg-slate-50/70 dark:bg-slate-900 p-5 flex flex-col justify-between gap-4 hover:shadow-md dark:hover:border-purple-500/40 dark:shadow-slate-950/40 transition">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2.5">
                                <div className="h-9 w-9 rounded-xl bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                    <Presentation className="h-4.5 w-4.5" />
                                </div>
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white">PDF-to-Slide Deck</h4>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                Convert study material into an executive slide deck with bullet points, takeaways, and PDF export.
                            </p>
                        </div>
                        <button
                            onClick={() => setIsPresentationModalOpen(true)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 px-4 py-2.5 text-white text-xs font-semibold shadow-xs transition"
                        >
                            <span>Open Slide Deck</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    {/* 3. Personalized Weak-Topic Quiz Card */}
                    <div className="rounded-xl border border-slate-200 dark:border-amber-500/20 bg-slate-50/70 dark:bg-slate-900 p-5 flex flex-col justify-between gap-4 hover:shadow-md dark:hover:border-amber-500/40 dark:shadow-slate-950/40 transition">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2.5">
                                <div className="h-9 w-9 rounded-xl bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                    <Target className="h-4.5 w-4.5" />
                                </div>
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Weak Topic Diagnostic Quiz</h4>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                AI focuses on tricky concepts and past low-scoring topics to test your retention and bridge gaps.
                            </p>
                        </div>
                        <button
                            onClick={handleGenerateWeakTopicQuiz}
                            disabled={loadingAction === 'weak-quiz'}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2.5 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
                        >
                            {loadingAction === 'weak-quiz' ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Generating...</span>
                                </>
                            ) : (
                                <>
                                    <span>Take Targeted Quiz</span>
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </>
                            )}
                        </button>
                    </div>

                    {/* 4. Generate Summary Card */}
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900 p-5 flex flex-col justify-between gap-4 hover:shadow-md dark:hover:border-slate-700 dark:shadow-slate-950/40 transition">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2.5">
                                <div className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                    <BookOpen className="h-4.5 w-4.5" />
                                </div>
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Document Overview Summary</h4>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                Generate an executive summary of key ideas and concepts covered across this document.
                            </p>
                        </div>
                        <button
                            onClick={handleGenerateSummary}
                            disabled={loadingAction === 'summary'}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 px-4 py-2.5 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
                        >
                            {loadingAction === 'summary' ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Summarizing...</span>
                                </>
                            ) : (
                                <span>Generate Summary</span>
                            )}
                        </button>
                    </div>

                    {/* 5. Explain Specific Concept */}
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900 p-5 flex flex-col justify-between gap-4 md:col-span-2 lg:col-span-2 hover:shadow-md dark:hover:border-slate-700 dark:shadow-slate-950/40 transition">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2.5">
                                <div className="h-9 w-9 rounded-xl bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                    <Lightbulb className="h-4.5 w-4.5" />
                                </div>
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Explain Any Specific Concept</h4>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                Enter a specific formula, algorithm, or theorem from this document for a crystal-clear breakdown with analogies.
                            </p>
                        </div>
                        <form onSubmit={handleExplainConcept} className="flex gap-2">
                            <input
                                type="text"
                                value={concept}
                                onChange={(e) => setConcept(e.target.value)}
                                disabled={loadingAction === 'explain'}
                                placeholder="e.g. Backpropagation, Normalization, Semaphore..."
                                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                            />
                            <button
                                type="submit"
                                disabled={loadingAction === 'explain'}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50 shrink-0"
                            >
                                {loadingAction === 'explain' ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <span>Explain</span>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* General Content Result Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={modalTitle}
            >
                <div className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                    <MarkdownRenderer content={modalContent} />
                </div>
            </Modal>

            {/* Specialized Study Notes Modal */}
            <StudyNotesModal
                isOpen={isNotesModalOpen}
                onClose={() => setIsNotesModalOpen(false)}
                documentId={documentId}
                documentTitle={documentTitle || 'Document'}
            />

            {/* Specialized Mind Map Modal */}
            <MindMapModal
                isOpen={isMindMapModalOpen}
                onClose={() => setIsMindMapModalOpen(false)}
                documentId={documentId}
                documentTitle={documentTitle || 'Document'}
            />

            {/* Specialized Presentation Slide Deck Modal */}
            <PresentationModal
                isOpen={isPresentationModalOpen}
                onClose={() => setIsPresentationModalOpen(false)}
                documentId={documentId}
                documentTitle={documentTitle || 'Document'}
            />
        </>
    )
}

export default AiAction
