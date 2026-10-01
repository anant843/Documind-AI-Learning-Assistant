import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, XCircle, Trophy, Target, BookOpen, Printer, RotateCcw, Award, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

import quizService from '../../services/quizService.js'
import PageHeader from '../../Components/common/PageHeader.jsx'
import Spinner from '../../Components/common/Spinner.jsx'
import Button from '../../Components/common/Button.jsx'

const QuizResultPage = () => {
    const { quizId } = useParams()
    const navigate = useNavigate()
    const [results, setResults] = useState(null)
    const [loading, setLoading] = useState(true)
    const [retaking, setRetaking] = useState(false)

    useEffect(() => {
        const fetchResults = async () => {
            try {
                const res = await quizService.getQuizResults(quizId)
                setResults(res)
            } catch (error) {
                toast.error(error.message || "Failed to load quiz results")
            } finally {
                setLoading(false)
            }
        }
        fetchResults()
    }, [quizId])

    const handleRetakeQuiz = async () => {
        setRetaking(true)
        try {
            await quizService.resetQuiz(quizId)
            toast.success("Quiz reset for a new attempt!")
            navigate(`/quizzes/${quizId}`)
        } catch (error) {
            toast.error(error.message || "Failed to reset quiz")
        } finally {
            setRetaking(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Spinner size="lg" />
            </div>
        )
    }

    if (!results || !results.data) {
        return (
            <div className="min-h-[50vh] flex flex-col items-center justify-center text-center space-y-4">
                <p className="text-slate-500 dark:text-slate-400">No quiz results available.</p>
                <Link to="/documents" className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    ← Return to Documents
                </Link>
            </div>
        )
    }

    const { data: { quiz, results: detailedResults } } = results
    const score = quiz.score ?? 0
    const totalQuestions = detailedResults?.length || quiz.totalQuestions || 0
    const correctAnswers = (detailedResults || []).filter(r => r.isCorrect).length
    const incorrectAnswers = totalQuestions - correctAnswers

    const getScoreFeedback = (s) => {
        if (s >= 80) {
            return {
                title: "Outstanding Mastery!",
                desc: "You demonstrated deep understanding of the concepts in this document.",
                gradient: " ",
                badgeBg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
            }
        }
        if (s >= 50) {
            return {
                title: "Solid Comprehension!",
                desc: "Good grasp of core concepts. Review the explanations below to refine weak areas.",
                gradient: " ",
                badgeBg: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
            }
        }
        return {
            title: "Needs Revision",
            desc: "Take a moment to review the document and re-attempt the quiz to reinforce key concepts.",
            gradient: " ",
            badgeBg: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30"
        }
    }

    const feedback = getScoreFeedback(score)
    const docId = quiz.document?._id || quiz.document

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Top Navigation & Print Controls */}
            <div className="flex items-center justify-between no-print">
                <Link 
                    to={docId ? `/documents/${docId}` : '/dashboard'} 
                    className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Document</span>
                </Link>

                <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={handleRetakeQuiz} disabled={retaking}>
                        {retaking ? <Spinner size="sm" /> : <RotateCcw className="mr-1.5 h-4 w-4" />}
                        Retake Quiz
                    </Button>

                    <button
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs transition"
                        title="Print or Export Quiz Result"
                    >
                        <Printer className="h-4 w-4" />
                        <span>Print Report</span>
                    </button>
                </div>
            </div>

            <PageHeader title={`Quiz Results: ${quiz.title || 'Document Assessment'}`} />

            {/* Performance Hero & Analytics Cards */}
            <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
                {/* Score Hero */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${feedback.badgeBg}`}>
                                <Sparkles className="h-3.5 w-3.5" />
                                {feedback.title}
                            </span>
                            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-2">
                                {score}%
                            </h2>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                {feedback.desc}
                            </p>
                        </div>

                        <div className={`h-16 w-16 rounded-xl bg-slate-900 ${feedback.gradient} text-white flex items-center justify-center shadow-sm shrink-0`}>
                            <Trophy className="h-8 w-8" />
                        </div>
                    </div>

                    <div className="mt-6">
                        <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div 
                                className={`h-3 rounded-full bg-slate-900 ${feedback.gradient} transition-all duration-700`} 
                                style={{ width: `${score}%` }} 
                            />
                        </div>
                    </div>
                </div>

                {/* Summary Metrics */}
                <div className="space-y-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center gap-2.5">
                        <Target className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            Assessment Summary
                        </h3>
                    </div>

                    <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                            <span>Total Questions</span>
                            <strong className="text-slate-900 dark:text-white font-bold">{totalQuestions}</strong>
                        </div>
                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                            <span>Correct Answers</span>
                            <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{correctAnswers}</strong>
                        </div>
                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                            <span>Incorrect Answers</span>
                            <strong className="text-rose-600 dark:text-rose-400 font-bold">{incorrectAnswers}</strong>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> {correctAnswers} Correct
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 px-3 py-1 text-xs font-bold text-rose-700 dark:text-rose-300">
                            <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" /> {incorrectAnswers} Incorrect
                        </span>
                    </div>
                </div>
            </div>

            {/* Detailed Question Review Section */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <BookOpen className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Document Grounded Review</h3>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            Verified answers and explanations extracted directly from the document.
                        </p>
                    </div>
                </div>

                <div className="space-y-6">
                    {(detailedResults || []).map((item, index) => {
                        const isCorrect = Boolean(item?.isCorrect)
                        const userAns = (item?.userAnswer || item?.selectedAnswer || item?.selectedOption || "").toString().trim()
                        const correctDisplay = item?.correctAnswer || (item?.correctOption ? `Option ${item.correctOption}` : "N/A")

                        return (
                            <div
                                key={item?._id || `result-q-${index}`}
                                className={`rounded-xl border p-5 sm:p-6 transition ${
                                    isCorrect
                                        ? 'border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/20'
                                        : 'border-rose-500/30 bg-rose-50/30 dark:bg-rose-950/20'
                                }`}
                            >
                                {/* Question Header */}
                                <div className="flex items-start justify-between gap-4 mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            Question {index + 1}
                                        </span>
                                        {item?.difficulty && (
                                            <span className="rounded-full bg-slate-200/70 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300 capitalize">
                                                {item.difficulty}
                                            </span>
                                        )}
                                    </div>

                                    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-bold border shadow-xs ${
                                        isCorrect
                                            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                                            : "bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300"
                                    }`}>
                                        {isCorrect ? (
                                            <>
                                                <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Correct
                                            </>
                                        ) : (
                                            <>
                                                <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" /> Incorrect
                                            </>
                                        )}
                                    </span>
                                </div>

                                {/* Question Title */}
                                <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed mb-4">
                                    {item?.question || "Question prompt"}
                                </h4>

                                {/* All 4 Options Grid */}
                                {Array.isArray(item?.options) && item.options.length > 0 && (
                                    <div className="grid gap-2.5 my-3">
                                        {item.options.map((opt, optIdx) => {
                                            const optId = (typeof opt === 'object' && opt.id ? opt.id : ['A', 'B', 'C', 'D'][optIdx] || String(optIdx + 1)).toUpperCase()
                                            const optText = typeof opt === 'object' && opt.text !== undefined ? opt.text : (typeof opt === 'string' ? opt : '')
                                            
                                            const isOptCorrect = optId === item.correctOption?.toUpperCase() || correctDisplay.startsWith(`${optId}:`)
                                            const isOptSelected = optId === item.selectedOption?.toUpperCase() || userAns === optText || userAns.startsWith(`${optId}:`)

                                            let optionStyle = "border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300"
                                            if (isOptCorrect) {
                                                optionStyle = "border-emerald-500 bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-200 font-semibold ring-1 ring-emerald-500"
                                            } else if (isOptSelected && !isCorrect) {
                                                optionStyle = "border-rose-400 bg-rose-100/70 dark:bg-rose-950/60 text-rose-950 dark:text-rose-200 font-semibold"
                                            }

                                            return (
                                                <div
                                                    key={optId}
                                                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-xs sm:text-sm transition ${optionStyle}`}
                                                >
                                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-black/5 dark:bg-white/10 font-bold text-xs">
                                                        {optId}
                                                    </span>

                                                    <span className="flex-1 font-medium leading-relaxed">
                                                        {optText}
                                                    </span>

                                                    {isOptCorrect && (
                                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
                                                            <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Correct
                                                        </span>
                                                    )}

                                                    {isOptSelected && !isCorrect && (
                                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 dark:text-rose-300 shrink-0">
                                                            <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" /> Your Choice
                                                        </span>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}

                                {/* Document Grounded Explanation Callout */}
                                {item?.explanation && (
                                    <div className="mt-4 rounded-xl border border-blue-100 dark:border-blue-900/50 bg-blue-50/70 dark:bg-blue-950/30 p-3.5 text-xs sm:text-sm text-blue-950 dark:text-blue-200 flex items-start gap-2.5">
                                        <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                        <div>
                                            <span className="font-bold text-blue-900 dark:text-blue-300">Explanation & Citation: </span>
                                            <span className="leading-relaxed">{item.explanation}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default QuizResultPage
