import React, { useState, useEffect } from 'react'
import { Bookmark, RotateCcw, BookMarked } from 'lucide-react'

const Flashcard = ({ flashcard, onToggleStar }) => {
    const [isFlipped, setIsFlipped] = useState(false)

    // Always reset to front side (question) whenever a new card is loaded or navigated to
    useEffect(() => {
        setIsFlipped(false)
    }, [flashcard?._id, flashcard?.question])

    const handleFlip = () => {
        setIsFlipped((prev) => !prev)
    }

    const handleStar = (e) => {
        e.stopPropagation()
        if (onToggleStar) {
            onToggleStar(flashcard._id)
        }
    }

    const getDifficultyStyles = (difficulty) => {
        const level = difficulty?.toLowerCase() || 'medium'
        const styles = {
            easy: 'bg-blue-100 text-blue-800 ring-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:ring-blue-700',
            medium: 'bg-indigo-100 text-indigo-800 ring-indigo-300 dark:bg-indigo-950 dark:text-indigo-300 dark:ring-indigo-700',
            hard: 'bg-rose-100 text-rose-800 ring-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-700'
        }
        return styles[level] || styles.medium
    }

    return (
        <div className="relative w-full h-80 flex items-center justify-center" style={{ perspective: '1200px' }}>
            <div
                role="button"
                tabIndex={0}
                onClick={handleFlip}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleFlip()}
                className="relative h-full w-full max-w-xl md:max-w-2xl cursor-pointer transition-transform duration-500 transform-gpu"
                style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
            >
                {/* Front Side (Question) */}
                <div
                    className="flashcard-front absolute inset-0 rounded-xl p-6 md:p-8 flex flex-col justify-between overflow-hidden"
                    style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                >
                    <div className="absolute inset-x-0 top-0 h-1.5 bg-slate-900   " />

                    <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-700/80 pb-3">
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 dark:bg-blue-400/20 px-3 py-1 text-xs font-bold text-blue-700 dark:text-blue-300 border border-blue-500/30">
                            <BookMarked className="h-3.5 w-3.5" /> Question
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1 ${getDifficultyStyles(flashcard.difficulty)}`}>
                                {flashcard.difficulty?.charAt(0).toUpperCase() + flashcard.difficulty?.slice(1) || 'Medium'}
                            </div>
                            <button
                                type="button"
                                onClick={handleStar}
                                aria-label={flashcard.isStarred ? 'Unstar flashcard' : 'Star flashcard'}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-200/60 dark:bg-slate-700/70 text-indigo-500 dark:text-indigo-400 shadow-xs border border-slate-300/80 dark:border-slate-600/80 transition hover:scale-105"
                            >
                                <Bookmark className={`h-4 w-4 ${flashcard.isStarred ? 'fill-indigo-400' : 'text-slate-400 dark:text-slate-400'}`} />
                            </button>
                        </div>
                    </div>

                    <div className="my-auto py-4 space-y-3">
                        <p className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white leading-relaxed text-center drop-shadow-xs">
                            {flashcard.question}
                        </p>
                    </div>

                    <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 border-t border-slate-200/80 dark:border-slate-700/80 pt-3">
                        <span>Click anywhere to flip</span>
                        <span className="inline-flex items-center gap-1 text-blue-600 dark:text-teal-400 font-semibold">
                            <RotateCcw className="h-3.5 w-3.5" /> Reveal answer
                        </span>
                    </div>
                </div>

                {/* Back Side (Answer) */}
                <div
                    className="flashcard-back absolute inset-0 rotateY-180 rounded-xl p-6 md:p-8 text-white flex flex-col justify-between overflow-hidden"
                    style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                    <div className="absolute inset-x-0 top-0 h-1.5 bg-slate-900   " />

                    <div className="flex items-center justify-between gap-3 border-b border-white/20 pb-3">
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white">
                            <BookMarked className="h-3.5 w-3.5" /> Answer
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold bg-white/15 text-white">
                                {flashcard.difficulty?.charAt(0).toUpperCase() + flashcard.difficulty?.slice(1) || 'Medium'}
                            </div>
                            <button
                                type="button"
                                onClick={handleStar}
                                aria-label={flashcard.isStarred ? 'Unstar flashcard' : 'Star flashcard'}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-indigo-300 transition hover:scale-105"
                            >
                                <Bookmark className={`h-4 w-4 ${flashcard.isStarred ? 'fill-indigo-300' : 'text-white/60'}`} />
                            </button>
                        </div>
                    </div>

                    <div className="my-auto py-4 space-y-3">
                        <p className="text-base md:text-lg font-semibold leading-relaxed text-white text-center">
                            {flashcard.answer}
                        </p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-white/80 border-t border-white/20 pt-3">
                        <span>Click to flip back</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-white">
                            <RotateCcw className="h-3.5 w-3.5" /> Back to question
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Flashcard
