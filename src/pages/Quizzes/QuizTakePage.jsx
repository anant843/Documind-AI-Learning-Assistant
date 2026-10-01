import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, CheckCircle, ArrowLeft, AlertCircle, HelpCircle, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'

import quizService from '../../services/quizService.js'
import PageHeader from '../../Components/common/PageHeader.jsx'
import Button from '../../Components/common/Button.jsx'
import Spinner from '../../Components/common/Spinner.jsx'
import Modal from '../../Components/common/Modal.jsx'

const QuizTakePage = () => {
    const { quizId } = useParams()
    const navigate = useNavigate()
    const [quiz, setQuiz] = useState(null)
    const [loading, setLoading] = useState(true)
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [selectedAnswers, setSelectedAnswers] = useState({}) // { [index]: 'A' | 'B' | 'C' | 'D' }
    const [submitting, setSubmitting] = useState(false)
    const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)

    useEffect(() => {
        const fetchQuiz = async () => {
            try {
                const res = await quizService.getQuizById(quizId)
                setQuiz(res.data)

                // If already completed, redirect to results
                if (res.data?.completedAt) {
                    toast.info("This quiz was already completed. Showing results.")
                    navigate(`/quizzes/${quizId}/results`, { replace: true })
                }
            } catch (error) {
                toast.error(error.message || 'Failed to load quiz')
                console.error('Error fetching quiz:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchQuiz()
    }, [quizId, navigate])

    const handleOptionSelect = (questionIndex, optionId) => {
        setSelectedAnswers(prev => ({
            ...prev,
            [questionIndex]: optionId
        }))
    }

    // Keyboard shortcut support (A, B, C, D)
    const handleKeyDown = useCallback((e) => {
        if (!quiz || !Array.isArray(quiz.questions)) return
        const key = e.key.toUpperCase()
        if (['A', 'B', 'C', 'D'].includes(key)) {
            handleOptionSelect(currentQuestionIndex, key)
        } else if (['1', '2', '3', '4'].includes(key)) {
            const map = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' }
            handleOptionSelect(currentQuestionIndex, map[key])
        } else if (e.key === 'ArrowRight' && currentQuestionIndex < quiz.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1)
        } else if (e.key === 'ArrowLeft' && currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1)
        }
    }, [quiz, currentQuestionIndex])

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleKeyDown])

    const handleNextQuestion = () => {
        if (quiz && currentQuestionIndex < quiz.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1)
        }
    }

    const handlePrevQuestion = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1)
        }
    }

    const executeSubmission = async () => {
        if (!quiz || !Array.isArray(quiz.questions)) return
        setSubmitting(true)
        setShowSubmitConfirm(false)
        try {
            const formattedAnswers = quiz.questions.map((question, index) => {
                const selectedId = (selectedAnswers[index] || "").toString().trim().toUpperCase()
                let selectedText = ""

                if (selectedId && Array.isArray(question.options)) {
                    const matched = question.options.find(o => 
                        (typeof o === 'object' && o.id?.toUpperCase() === selectedId)
                    )
                    if (matched) {
                        selectedText = matched.text
                    }
                }

                return { 
                    questionIndex: index, 
                    selectedOption: selectedId,
                    selectedAnswer: selectedText || (selectedId ? `Option ${selectedId}` : "")
                }
            })

            await quizService.submitQuiz(quizId, formattedAnswers)
            toast.success("Quiz submitted successfully!")
            navigate(`/quizzes/${quizId}/results`)
        } catch (error) {
            toast.error(error.message || "Failed to submit quiz")
        } finally {
            setSubmitting(false)
        }
    }

    const handleSubmitClick = () => {
        const total = quiz?.questions?.length || 0
        const answered = Object.values(selectedAnswers).filter(Boolean).length
        if (answered < total) {
            setShowSubmitConfirm(true)
        } else {
            executeSubmission()
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Spinner size="lg" />
            </div>
        )
    }

    if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
        return (
            <div className="max-w-2xl mx-auto text-center py-16">
                <p className="text-slate-500 dark:text-slate-400">No quiz questions available for this document.</p>
                <Link to="/documents" className="mt-4 inline-block text-sm text-blue-600 dark:text-blue-400 font-semibold">
                    ← Back to Documents
                </Link>
            </div>
        )
    }

    const currentQuestion = quiz.questions[currentQuestionIndex]
    const totalQuestions = quiz.questions.length
    const answeredCount = Object.values(selectedAnswers).filter(Boolean).length
    const unansweredCount = totalQuestions - answeredCount
    const progressPercent = Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100)

    const docId = quiz.documentId?._id || quiz.documentId

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Top Navigation Row */}
            <div className="flex items-center justify-between">
                <Link
                    to={docId ? `/documents/${docId}` : '/documents'}
                    className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Document</span>
                </Link>

                <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
                    Use keys <kbd className="px-1.5 py-0.5 rounded-sm bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[10px]">A</kbd> <kbd className="px-1.5 py-0.5 rounded-sm bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[10px]">B</kbd> <kbd className="px-1.5 py-0.5 rounded-sm bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[10px]">C</kbd> <kbd className="px-1.5 py-0.5 rounded-sm bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[10px]">D</kbd> to answer
                </span>
            </div>

            <PageHeader title={quiz.title || "Document Quiz"} />

            {/* Main Interactive Card */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm space-y-6">
                
                {/* Progress Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 font-medium">
                        <span>Question <strong className="text-slate-900 dark:text-white text-base font-bold">{currentQuestionIndex + 1}</strong> of {totalQuestions}</span>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span>Answered <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{answeredCount}</strong>/{totalQuestions}</span>
                    </div>

                    <div className="w-full sm:w-60">
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                                className="h-2 rounded-full bg-slate-900    transition-all duration-300"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Question Stem Box */}
                <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 p-5 sm:p-6">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                            Question {currentQuestionIndex + 1}
                        </span>
                        {currentQuestion?.difficulty && (
                            <span className="rounded-full bg-blue-100 dark:bg-blue-950/60 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 dark:text-blue-300 capitalize">
                                {currentQuestion.difficulty}
                            </span>
                        )}
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-relaxed">
                        {currentQuestion?.question || "Question prompt"}
                    </h2>
                </div>

                {/* Options List (A, B, C, D) */}
                <div className="space-y-3">
                    {(currentQuestion?.options || []).map((opt, idx) => {
                        const optId = (typeof opt === 'object' && opt.id ? opt.id : ['A', 'B', 'C', 'D'][idx] || String(idx + 1)).toUpperCase()
                        const optText = typeof opt === 'object' && opt.text !== undefined ? opt.text : (typeof opt === 'string' ? opt : '')
                        const isSelected = selectedAnswers[currentQuestionIndex] === optId

                        return (
                            <label
                                key={optId || idx}
                                onClick={() => handleOptionSelect(currentQuestionIndex, optId)}
                                className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all ${
                                    isSelected
                                        ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20 text-slate-900 dark:text-white shadow-xs'
                                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                                }`}
                            >
                                <div className="flex items-center gap-3.5 w-full">
                                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition ${
                                        isSelected
                                            ? 'bg-emerald-600 text-white shadow-xs'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                    }`}>
                                        {optId}
                                    </div>

                                    <input
                                        type="radio"
                                        name={`quiz-q-${currentQuestionIndex}`}
                                        value={optId}
                                        checked={isSelected}
                                        onChange={() => handleOptionSelect(currentQuestionIndex, optId)}
                                        className="sr-only"
                                    />

                                    <span className="text-sm font-medium leading-relaxed flex-1">
                                        {optText}
                                    </span>
                                </div>
                            </label>
                        )
                    })}
                </div>

                {/* Footer Controls & Question Map */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Question Jump Grid */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        {quiz.questions.map((_, index) => {
                            const isCurrent = index === currentQuestionIndex
                            const isAnswered = Boolean(selectedAnswers[index])
                            return (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => setCurrentQuestionIndex(index)}
                                    className={`h-9 w-9 rounded-xl border text-xs font-bold transition ${
                                        isCurrent
                                            ? 'border-blue-600 bg-blue-600 text-white shadow-xs scale-105'
                                            : isAnswered
                                                ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                                    }`}
                                    title={`Go to Question ${index + 1}`}
                                >
                                    {index + 1}
                                </button>
                            )
                        })}
                    </div>

                    {/* Prev / Next / Submit Action Buttons */}
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={handlePrevQuestion}
                            disabled={currentQuestionIndex === 0}
                            variant="secondary"
                        >
                            <ChevronLeft className="mr-1.5 h-4 w-4" />
                            Previous
                        </Button>

                        {currentQuestionIndex < totalQuestions - 1 ? (
                            <Button onClick={handleNextQuestion}>
                                Next
                                <ChevronRight className="ml-1.5 h-4 w-4" />
                            </Button>
                        ) : (
                            <Button onClick={handleSubmitClick} disabled={submitting}>
                                {submitting ? (
                                    <Spinner size="sm" />
                                ) : (
                                    <>
                                        <CheckCircle className="mr-1.5 h-4 w-4" />
                                        Submit Quiz
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Unanswered Questions Confirmation Modal */}
            <Modal
                isOpen={showSubmitConfirm}
                onClose={() => setShowSubmitConfirm(false)}
                title="Unanswered Questions"
            >
                <div className="space-y-4">
                    <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
                        <AlertCircle className="h-6 w-6 shrink-0" />
                        <p className="text-sm font-medium">
                            You have <strong className="font-bold">{unansweredCount}</strong> unanswered question(s). Unanswered questions will be evaluated as incorrect.
                        </p>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Do you wish to submit the quiz now or return to answer remaining questions?
                    </p>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="secondary" onClick={() => setShowSubmitConfirm(false)}>
                            Keep Answering
                        </Button>
                        <Button onClick={executeSubmission} disabled={submitting}>
                            {submitting ? <Spinner size="sm" /> : "Yes, Submit Now"}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}

export default QuizTakePage