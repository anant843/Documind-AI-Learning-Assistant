import React, { useState, useEffect } from 'react'
import {
    History as HistoryIcon,
    FileText,
    TrendingUp,
    Award,
    BookOpen,
    Trash2,
    ChevronDown,
    ChevronUp,
    Search,
    Clock,
    ChevronRight
} from 'lucide-react'
import { Link } from 'react-router-dom'
import moment from 'moment'
import toast from 'react-hot-toast'
import progressService from '../../services/progressService'
import { PageSkeleton } from '../../Components/common/LoadingState'

const HistoryPage = () => {
    const [loading, setLoading] = useState(true)
    const [historyData, setHistoryData] = useState({ summary: {}, items: [] })
    const [searchQuery, setSearchQuery] = useState('')
    const [expandedDocId, setExpandedDocId] = useState(null)
    const [activeTabMap, setActiveTabMap] = useState({}) // { [id]: 'quizzes' | 'flashcards' }
    const [deletingId, setDeletingId] = useState(null)

    const fetchHistory = async () => {
        try {
            setLoading(true)
            const res = await progressService.getHistory()
            if (res?.data) {
                setHistoryData(res.data)
            }
        } catch (err) {
            console.error('Error fetching history:', err)
            toast.error(err.message || 'Failed to load archived history')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchHistory()
    }, [])

    const handleDelete = async (id, title) => {
        if (!window.confirm(`Are you sure you want to permanently delete the history for "${title}"?`)) {
            return
        }

        try {
            setDeletingId(id)
            await progressService.deleteHistoryItem(id)
            toast.success('Archived record deleted')
            setHistoryData(prev => ({
                ...prev,
                items: prev.items.filter(item => item._id !== id),
                summary: {
                    ...prev.summary,
                    totalDeletedDocs: Math.max(0, (prev.summary.totalDeletedDocs || 1) - 1)
                }
            }))
        } catch (err) {
            toast.error(err.message || 'Failed to delete history record')
        } finally {
            setDeletingId(null)
        }
    }

    const handleClearAll = async () => {
        if (!window.confirm('Are you sure you want to clear ALL archived history records? This cannot be undone.')) {
            return
        }

        try {
            await progressService.deleteHistoryItem('all')
            toast.success('All history cleared')
            setHistoryData({
                summary: {
                    totalDeletedDocs: 0,
                    totalHistoricalQuizzes: 0,
                    totalHistoricalFlashcards: 0,
                    totalHistoricalMastered: 0,
                    overallHistoricalAvgScore: 0
                },
                items: []
            })
        } catch {
            toast.error('Failed to clear history')
        }
    }

    const toggleExpand = (id) => {
        setExpandedDocId(prev => (prev === id ? null : id))
        if (!activeTabMap[id]) {
            setActiveTabMap(prev => ({ ...prev, [id]: 'quizzes' }))
        }
    }

    const setCardTab = (docId, tab) => {
        setActiveTabMap(prev => ({ ...prev, [docId]: tab }))
    }

    const summary = historyData.summary || {}
    const items = historyData.items || []

    const filteredItems = items.filter(item =>
        item.documentTitle.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (loading) {
        return <PageSkeleton variant="list" />
    }

    const summaryCards = [
        {
            label: 'Archived Documents',
            value: summary.totalDeletedDocs || 0,
            icon: FileText,
            color: ' ',
            textColor: 'text-blue-600 dark:text-blue-400'
        },
        {
            label: 'Historical Quizzes',
            value: summary.totalHistoricalQuizzes || 0,
            icon: TrendingUp,
            color: ' ',
            textColor: 'text-indigo-600 dark:text-indigo-400'
        },
        {
            label: 'Historical Avg Score',
            value: `${summary.overallHistoricalAvgScore || 0}%`,
            icon: Award,
            color: ' ',
            textColor: 'text-purple-600 dark:text-purple-400'
        },
        {
            label: 'Archived Flashcards',
            value: `${summary.totalHistoricalMastered || 0}/${summary.totalHistoricalFlashcards || 0}`,
            icon: BookOpen,
            color: ' ',
            textColor: 'text-cyan-600 dark:text-cyan-400'
        },
    ]

    return (
        <div className="space-y-6 sm:space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-cyan-400 border border-blue-100 dark:border-blue-800/40 flex items-center justify-center">
                            <HistoryIcon className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                                Learning History & Archive
                            </h1>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                Safely preserved quiz scores, flashcards, and performance metrics from previously deleted PDFs.
                            </p>
                        </div>
                    </div>
                </div>

                {items.length > 0 && (
                    <button
                        onClick={handleClearAll}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition shadow-xs self-start sm:self-auto"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Clear All History</span>
                    </button>
                )}
            </div>

            {/* Summary Metrics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {summaryCards.map((card, idx) => (
                    <div
                        key={idx}
                        className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{card.label}</span>
                            <div className={`p-2 rounded-xl bg-slate-900 ${card.color} text-white shadow-xs`}>
                                <card.icon className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-4">
                            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                                {card.value}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Search Bar */}
            {items.length > 0 && (
                <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                        <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter archived documents by title..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                        />
                    </div>
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                        Showing {filteredItems.length} of {items.length} records
                    </span>
                </div>
            )}

            {/* History List */}
            {items.length === 0 ? (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center shadow-xs">
                    <div className="mx-auto h-16 w-16 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-cyan-400 border border-blue-100 dark:border-blue-800/40 flex items-center justify-center mb-4 shadow-inner">
                        <HistoryIcon className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Archived Document History</h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
                        Whenever you delete an uploaded PDF, its quiz records, scores, and flashcard progress are automatically preserved here so you never lose track of your past achievements.
                    </p>
                    <div className="mt-6 flex justify-center gap-3">
                        <Link
                            to="/documents"
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
                        >
                            <span>Go to Documents</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    No archived document matches "{searchQuery}".
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredItems.map((item) => {
                        const isExpanded = expandedDocId === item._id
                        const activeTab = activeTabMap[item._id] || 'quizzes'
                        const avgScore = item.averageQuizScore || 0
                        const isHigh = avgScore >= 70
                        const isMid = avgScore >= 50 && avgScore < 70

                        return (
                            <div
                                key={item._id}
                                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden transition"
                            >
                                {/* Card Main Header */}
                                <div className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="font-bold text-base text-slate-900 dark:text-white truncate max-w-md">
                                                {item.documentTitle}
                                            </h3>
                                            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                                <Clock className="h-3 w-3" />
                                                Deleted {moment(item.deletedAt).fromNow()}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 text-xs">
                                            {/* Avg Score Badge */}
                                            <span
                                                className={`font-semibold px-2.5 py-0.5 rounded-full border ${
                                                    isHigh
                                                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                                                        : isMid
                                                        ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                                                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                                                }`}
                                            >
                                                Avg Score: {avgScore}%
                                            </span>

                                            {/* Quizzes Pill */}
                                            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-medium">
                                                {item.completedQuizzesCount || item.quizzesCount || 0} Quizzes Taken
                                            </span>

                                            {/* Flashcards Pill */}
                                            <span className="px-2.5 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 font-medium">
                                                {item.totalFlashcards || 0} Flashcards ({item.flashcardsMastery || 0}% Mastered)
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => toggleExpand(item._id)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                                        >
                                            <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item._id, item.documentTitle)}
                                            disabled={deletingId === item._id}
                                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition disabled:opacity-50"
                                            title="Delete this archive record"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Drawer */}
                                {isExpanded && (
                                    <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-5 space-y-4">
                                        {/* Drawer Tabs */}
                                        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                                            <button
                                                onClick={() => setCardTab(item._id, 'quizzes')}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                                    activeTab === 'quizzes'
                                                        ? 'bg-blue-600 text-white shadow-xs'
                                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                                }`}
                                            >
                                                Quizzes History ({item.quizzes ? item.quizzes.length : 0})
                                            </button>
                                            <button
                                                onClick={() => setCardTab(item._id, 'flashcards')}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                                    activeTab === 'flashcards'
                                                        ? 'bg-blue-600 text-white shadow-xs'
                                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                                }`}
                                            >
                                                Flashcard Decks ({item.flashcardSets ? item.flashcardSets.length : 0})
                                            </button>
                                        </div>

                                        {/* Tab Content: Quizzes */}
                                        {activeTab === 'quizzes' && (
                                            <div className="space-y-2">
                                                {(!item.quizzes || item.quizzes.length === 0) ? (
                                                    <p className="text-xs text-slate-500 py-3">No quiz attempts were recorded for this document.</p>
                                                ) : (
                                                    item.quizzes.map((quiz, qIdx) => (
                                                        <div
                                                            key={qIdx}
                                                            className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                                                        >
                                                            <div className="space-y-0.5">
                                                                <h4 className="font-semibold text-slate-900 dark:text-white">{quiz.title}</h4>
                                                                <p className="text-[11px] text-slate-400">
                                                                    {quiz.totalQuestions || 5} Questions • {quiz.completedAt ? `Completed on ${moment(quiz.completedAt).format('MMM D, YYYY')}` : 'Attempted'}
                                                                </p>
                                                            </div>
                                                            <div className="text-right">
                                                                <span
                                                                    className={`font-bold px-2.5 py-1 rounded-lg ${
                                                                        quiz.score >= 70
                                                                            ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                                                                            : quiz.score >= 50
                                                                            ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                                                                            : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                                                                    }`}
                                                                >
                                                                    Score: {quiz.score}%
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}

                                        {/* Tab Content: Flashcards */}
                                        {activeTab === 'flashcards' && (
                                            <div className="space-y-3">
                                                {(!item.flashcardSets || item.flashcardSets.length === 0) ? (
                                                    <p className="text-xs text-slate-500 py-3">No flashcard decks were created for this document.</p>
                                                ) : (
                                                    item.flashcardSets.map((set, sIdx) => (
                                                        <div key={sIdx} className="space-y-2">
                                                            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                                                <span>Deck #{sIdx + 1} ({set.cardsCount || set.cards?.length || 0} cards)</span>
                                                                <span className="text-[11px] text-slate-400">{set.masteredCount || 0} mastered</span>
                                                            </div>
                                                            <div className="grid gap-2 sm:grid-cols-2 max-h-60 overflow-y-auto pr-1">
                                                                {(set.cards || []).map((card, cIdx) => (
                                                                    <div
                                                                        key={cIdx}
                                                                        className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1"
                                                                    >
                                                                        <div className="font-semibold text-slate-900 dark:text-white">
                                                                            Q: {card.question}
                                                                        </div>
                                                                        <div className="text-slate-600 dark:text-slate-300">
                                                                            A: {card.answer}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default HistoryPage
