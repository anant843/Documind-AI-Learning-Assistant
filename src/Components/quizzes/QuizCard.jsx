import React from 'react'
import { Link } from 'react-router-dom'
import { Play, BarChart2, Trash2, Award, RotateCcw, HelpCircle, CheckCircle, Calendar } from 'lucide-react'
import moment from 'moment'

const QuizCard = ({ quiz, onDelete, onRetake }) => {
    const isCompleted = Boolean(quiz?.completedAt)
    const questionCount = quiz?.questions?.length || quiz?.totalQuestions || 0
    const createdDate = quiz?.createdAt ? moment(quiz.createdAt).format('MMM D, YYYY') : 'Recent'
    const timeAgo = quiz?.createdAt ? moment(quiz.createdAt).fromNow() : ''
    const title = quiz?.title || `Quiz - ${createdDate}`
    const score = typeof quiz?.score === 'number' ? quiz.score : null

    const getScoreBadge = () => {
        if (!isCompleted) {
            return {
                bg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
                label: 'Not Taken',
                icon: HelpCircle
            }
        }
        if (score >= 80) {
            return {
                bg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
                label: `${score}% Score`,
                icon: Award
            }
        }
        if (score >= 50) {
            return {
                bg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
                label: `${score}% Score`,
                icon: Award
            }
        }
        return {
            bg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
            label: `${score}% Score`,
            icon: Award
        }
    }

    const badge = getScoreBadge()
    const BadgeIcon = badge.icon

    return (
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 shadow-xs hover:shadow-sm transition-all duration-200 hover:-translate-y-0.5">
            {/* Top Accent Gradient Bar */}
            <div className={`absolute inset-x-0 top-0 h-1 bg-slate-900 ${
                isCompleted 
                    ? (score >= 80 ? '  ' : score >= 50 ? '  ' : '  ')
                    : '  '
            }`} />

            <div>
                {/* Header Row: Score Badge & Actions */}
                <div className="flex items-start justify-between gap-3 mb-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border ${badge.bg}`}>
                        <BadgeIcon className="h-3.5 w-3.5" />
                        {badge.label}
                    </span>

                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation()
                            onDelete?.(quiz)
                        }}
                        className="opacity-70 group-hover:opacity-100 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent hover:border-red-200 dark:hover:border-red-900/60 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition"
                        title="Delete Quiz"
                        aria-label="Delete quiz"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug line-clamp-2" title={title}>
                    {title}
                </h3>

                {/* Metadata Pills */}
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 p-2.5 border border-slate-100 dark:border-slate-800/80">
                        <HelpCircle className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0" />
                        <div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium">Questions</p>
                            <p className="font-bold text-slate-900 dark:text-white text-sm">{questionCount}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 p-2.5 border border-slate-100 dark:border-slate-800/80">
                        <Calendar className="h-4 w-4 text-cyan-500 dark:text-cyan-400 shrink-0" />
                        <div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium">Created</p>
                            <p className="font-bold text-slate-900 dark:text-white text-xs truncate" title={timeAgo || createdDate}>
                                {timeAgo || createdDate}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                {isCompleted ? (
                    <>
                        <button
                            type="button"
                            onClick={() => onRetake?.(quiz)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Retake this quiz from start"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Retake</span>
                        </button>

                        <Link
                            to={`/quizzes/${quiz._id}/results`}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition"
                        >
                            <BarChart2 className="h-3.5 w-3.5" />
                            <span>View Results</span>
                        </Link>
                    </>
                ) : (
                    <Link
                        to={`/quizzes/${quiz._id}`}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs  transition"
                    >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>Start Document Quiz</span>
                    </Link>
                )}
            </div>
        </div>
    )
}

export default QuizCard