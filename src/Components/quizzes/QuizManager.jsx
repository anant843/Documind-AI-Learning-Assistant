import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Sparkles, BookOpen, Award, CheckCircle, HelpCircle, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'

import quizService from '../../services/quizService.js'
import aiService from '../../services/aiService.js'
import Spinner from '../common/Spinner.jsx'
import Button from '../common/Button.jsx'
import Modal from '../common/Modal.jsx'
import QuizCard from './QuizCard.jsx'
import EmptyState from '../common/EmptyState.jsx'

const QuizManager = ({ documentId }) => {
    const navigate = useNavigate()
    const [quizzes, setQuizzes] = useState([])
    const [loading, setLoading] = useState(false)
    const [generating, setGenerating] = useState(false)
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
    const [numQuestions, setNumQuestions] = useState("5")
    const [difficulty, setDifficulty] = useState("medium")
    const [customTitle, setCustomTitle] = useState("")
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [selectedQuiz, setSelectedQuiz] = useState(null)

    const fetchQuizzes = async () => {
        setLoading(true)
        try {
            const res = await quizService.getQuizzesForDocument(documentId)
            setQuizzes(res.data || [])
        } catch (error) {
            toast.error(error.message || "Failed to load quizzes")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (documentId) {
            fetchQuizzes()
        }
    }, [documentId])

    const handleGenerateQuiz = async (e) => {
        e.preventDefault()
        setGenerating(true)

        try {
            const count = Math.max(1, Math.min(20, parseInt(numQuestions, 10) || 5))
            const payload = {
                numQuestions: count,
                difficulty,
            }
            if (customTitle.trim()) {
                payload.title = customTitle.trim()
            }

            const response = await aiService.generateQuiz(documentId, payload)
            toast.success("Document quiz generated successfully!")
            setIsGenerateModalOpen(false)
            setCustomTitle("")
            await fetchQuizzes()

            // Optional auto-navigate to the new quiz
            if (response?.data?._id) {
                navigate(`/quizzes/${response.data._id}`)
            }
        } catch (error) {
            toast.error(error.message || "Failed to generate quiz")
        } finally {
            setGenerating(false)
        }
    }

    const handleDeleteRequest = (quiz) => {
        setSelectedQuiz(quiz)
        setIsDeleteModalOpen(true)
    }

    const handleConfirmDelete = async () => {
        if (!selectedQuiz) return
        setDeleting(true)
        try {
            await quizService.deleteQuiz(selectedQuiz._id)
            toast.success("Quiz deleted successfully")
            setIsDeleteModalOpen(false)
            setSelectedQuiz(null)
            setQuizzes(prev => prev.filter(q => q._id !== selectedQuiz._id))
        } catch (error) {
            toast.error(error.message || "Failed to delete quiz")
        } finally {
            setDeleting(false)
        }
    }

    const handleRetakeQuiz = async (quiz) => {
        try {
            await quizService.resetQuiz(quiz._id)
            toast.success("Quiz reset for a new attempt!")
            navigate(`/quizzes/${quiz._id}`)
        } catch (error) {
            toast.error(error.message || "Failed to reset quiz")
        }
    }

    // Compute document quiz analytics
    const completedQuizzes = quizzes.filter(q => Boolean(q.completedAt))
    const averageScore = completedQuizzes.length > 0
        ? Math.round(completedQuizzes.reduce((acc, q) => acc + (q.score || 0), 0) / completedQuizzes.length)
        : null

    const parsedCount = Math.max(1, Math.min(20, parseInt(numQuestions, 10) || 5))

    return (
        <div className="space-y-6">
            {/* Header & Overview Section */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Document Quizzes & Assessments</h2>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Interactive concept-testing quizzes generated directly from the content of this document.
                        </p>
                    </div>

                    <Button onClick={() => setIsGenerateModalOpen(true)} className="shrink-0 shadow-xs">
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate New Quiz
                    </Button>
                </div>

                {/* Overview Analytics Bar */}
                {quizzes.length > 0 && (
                    <div className="mt-5 grid grid-cols-3 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-100 dark:border-slate-800">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                                <HelpCircle className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase">Total Quizzes</p>
                                <p className="text-base font-bold text-slate-900 dark:text-white">{quizzes.length}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-100 dark:border-slate-800">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase">Completed</p>
                                <p className="text-base font-bold text-slate-900 dark:text-white">{completedQuizzes.length}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-100 dark:border-slate-800">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                                <Award className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase">Avg Score</p>
                                <p className="text-base font-bold text-slate-900 dark:text-white">
                                    {averageScore !== null ? `${averageScore}%` : '—'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Quiz Cards Grid or Loading/Empty State */}
            {loading ? (
                <div className="flex items-center justify-center min-h-[220px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <Spinner size="lg" />
                </div>
            ) : quizzes.length === 0 ? (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
                    <EmptyState
                        title="No Quizzes Generated Yet"
                        description="Create custom multiple-choice quizzes strictly based on the technical concepts in your document."
                    />
                    <div className="mt-4 flex justify-center">
                        <Button onClick={() => setIsGenerateModalOpen(true)}>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Generate First Quiz
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {quizzes.map((quiz) => (
                        <QuizCard
                            key={quiz._id}
                            quiz={quiz}
                            onDelete={() => handleDeleteRequest(quiz)}
                            onRetake={() => handleRetakeQuiz(quiz)}
                        />
                    ))}
                </div>
            )}

            {/* Generate Quiz Modal */}
            <Modal isOpen={isGenerateModalOpen} onClose={() => setIsGenerateModalOpen(false)} title="Generate Document Quiz">
                <form onSubmit={handleGenerateQuiz} className="space-y-4">
                    {/* Optional Custom Title */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Quiz Title (Optional)
                        </label>
                        <input
                            type="text"
                            value={customTitle}
                            onChange={(e) => setCustomTitle(e.target.value)}
                            placeholder="e.g. Core Concepts & Architecture Review"
                            className="w-full text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                        />
                    </div>

                    {/* Question Count Selector */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Number of Questions (1 - 20)
                            </label>
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                {parsedCount} questions
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setNumQuestions(prev => String(Math.max(1, (parseInt(prev, 10) || 1) - 1)))}
                                className="w-11 h-11 flex items-center justify-center border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-slate-700 dark:text-slate-200 select-none text-xl transition"
                                title="Decrease question count"
                            >
                                −
                            </button>
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={numQuestions}
                                onChange={(e) => {
                                    const clean = e.target.value.replace(/[^0-9]/g, '')
                                    setNumQuestions(clean)
                                }}
                                onBlur={() => {
                                    const parsed = parseInt(numQuestions, 10)
                                    if (isNaN(parsed) || parsed < 1) {
                                        setNumQuestions("5")
                                    } else if (parsed > 20) {
                                        setNumQuestions("20")
                                    } else {
                                        setNumQuestions(String(parsed))
                                    }
                                }}
                                className="w-full text-center border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 dark:text-white text-lg"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setNumQuestions(prev => String(Math.min(20, (parseInt(prev, 10) || 1) + 1)))}
                                className="w-11 h-11 flex items-center justify-center border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-slate-700 dark:text-slate-200 select-none text-xl transition"
                                title="Increase question count"
                            >
                                +
                            </button>
                        </div>

                        {/* Quick Presets */}
                        <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mr-1">Quick Select:</span>
                            {[3, 5, 7, 10, 15, 20].map((preset) => (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={() => setNumQuestions(String(preset))}
                                    className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all ${
                                        parsedCount === preset
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    {preset}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Difficulty Selection */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                            Difficulty Level
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'easy', label: 'Easy', desc: 'Core Definitions', color: 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300' },
                                { id: 'medium', label: 'Medium', desc: 'Mechanisms & Tradeoffs', color: 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300' },
                                { id: 'hard', label: 'Hard', desc: 'Deep Analysis', color: 'border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300' },
                            ].map((level) => (
                                <button
                                    key={level.id}
                                    type="button"
                                    onClick={() => setDifficulty(level.id)}
                                    className={`p-2.5 rounded-xl border text-center transition ${
                                        difficulty === level.id
                                            ? `${level.color} ring-2 ring-blue-500/30 font-bold shadow-xs`
                                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    <div className="text-xs">{level.label}</div>
                                    <div className="text-[10px] opacity-75 font-normal mt-0.5">{level.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <Button type="button" variant="secondary" onClick={() => setIsGenerateModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={generating}>
                            {generating ? (
                                <>
                                    <Spinner size="sm" />
                                    <span className="ml-2">Analyzing Document...</span>
                                </>
                            ) : (
                                `Generate ${parsedCount} Questions`
                            )}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Delete">
                <div className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Are you sure you want to delete <strong className="text-slate-900 dark:text-white">"{selectedQuiz?.title}"</strong>? Your score and attempt history will be permanently removed.
                    </p>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="button" variant="danger" disabled={deleting} onClick={handleConfirmDelete}>
                            {deleting ? <Spinner size="sm" /> : (
                                <>
                                    <Trash2 className="mr-1.5 h-4 w-4" />
                                    Delete Quiz
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}

export default QuizManager