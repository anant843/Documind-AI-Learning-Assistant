import React, { useState, useEffect } from 'react'
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  ArrowLeft,
  Sparkles,
  Printer,
  Award,
  Calendar,
  CheckCircle2,
  RefreshCw,
  Zap,
} from 'lucide-react'
import toast from 'react-hot-toast'
import moment from 'moment'
import aiService from '../../services/aiService.js'
import flashcardService from '../../services/flashcardService.js'
import Spinner from '../common/Spinner.jsx'
import Modal from '../common/Modal'
import Flashcard from './Flashcard.jsx'
import { LogoIcon } from '../common/Logo'

const FlashcardManager = ({ documentId }) => {
  const [flashcardSets, setFlashcardSets] = useState([]);
  const [selectedSet, setSelectedSet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [setToDelete, setSetToDelete] = useState(null);
  const [srsLoading, setSrsLoading] = useState(false);

  const fetchFlashcardSets = async () => {
    setLoading(true);
    try {
      const res = await flashcardService.getFlashcardsForDocument(documentId);
      setFlashcardSets(res.data);
    } catch (error) {
      toast.error(error.message || "Failed to load flashcard sets");
      console.error("Error fetching flashcard sets:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (documentId) {
      fetchFlashcardSets();
    }
  }, [documentId]);

  const handleGnerateFlashcards = async () => {
    setGenerating(true);
    try {
      await aiService.generateFlashcards(documentId);
      toast.success("Flashcards generated successfully");
      fetchFlashcardSets();
    } catch (error) {
      toast.error(error.message || "Failed to generate flashcards");
      console.error("Error generating flashcards:", error);
    } finally {
      setGenerating(false);
    }
  }

  const handleNextCard = () => {
    if (!selectedSet?.cards?.length) return;
    setCurrentCardIndex((prevIndex) => (prevIndex + 1) % selectedSet.cards.length);
  }

  const handlePreviousCard = () => {
    if (!selectedSet?.cards?.length) return;
    setCurrentCardIndex((prevIndex) => (prevIndex - 1 + selectedSet.cards.length) % selectedSet.cards.length);
  }

  const handleSRSReview = async (rating) => {
    const currentCard = selectedSet?.cards?.[currentCardIndex];
    if (!currentCard || srsLoading) return;

    setSrsLoading(true);
    try {
      const res = await flashcardService.reviewFlashcardSRS(currentCard._id, rating);
      const updatedSet = res.data;
      
      // Update local set state
      setFlashcardSets((prev) => prev.map((s) => (s._id === updatedSet._id ? updatedSet : s)));
      setSelectedSet(updatedSet);

      const days = rating === 'easy' ? 7 : rating === 'medium' ? 3 : 1;
      toast.success(`Scheduled for review in ${days} day${days > 1 ? 's' : ''}! +10 XP 🔥`);

      // Advance to next card if available
      if (currentCardIndex < updatedSet.cards.length - 1) {
        setCurrentCardIndex(prev => prev + 1);
      }
    } catch (error) {
      toast.error(error.message || "Failed to submit SRS review");
      console.error("Error in SRS review:", error);
    } finally {
      setSrsLoading(false);
    }
  }

  const handleToggle = async (cardId) => {
    if (!cardId) return;
    try {
      const res = await flashcardService.toggleStarFlashcard(cardId);
      const updatedSet = res.data;
      setFlashcardSets((prev) => prev.map((set) => (set._id === updatedSet._id ? updatedSet : set)));
      if (selectedSet?._id === updatedSet._id) {
        setSelectedSet(updatedSet);
      }
      toast.success("Flashcard starred updated");
    } catch (error) {
      toast.error(error.message || "Failed to update flashcard");
      console.error("Error toggling flashcard:", error);
    }
  }

  const handleDeleteRequest = (e, set) => {
    e.stopPropagation();
    setSetToDelete(set);
    setIsDeleteModalOpen(true);
  }

  const handleConfirmDelete = async () => {
    if (!setToDelete?._id) return;
    setDeleting(true);
    try {
      await flashcardService.deleteFlashcardSet(setToDelete._id);
      toast.success("Flashcard set deleted");
      setIsDeleteModalOpen(false);
      setSetToDelete(null);
      fetchFlashcardSets();
    } catch (error) {
      toast.error(error.message || "Failed to delete flashcard set");
      console.error("Error deleting flashcard set:", error);
    } finally {
      setDeleting(false);
    }
  }

  const handleSelectSet = (set) => {
    setSelectedSet(set);
    setCurrentCardIndex(0);
  }

  const handlePrintDeck = () => {
    window.print();
  }

  const renderFlashcardView = () => {
    if (!selectedSet) return null;
    const currentCard = selectedSet.cards?.[currentCardIndex];
    const totalCards = selectedSet.cards?.length || 0;
    const masteredCount = selectedSet.cards?.filter(c => c.masteryStatus === 'mastered').length || 0;
    const reviewingCount = selectedSet.cards?.filter(c => c.masteryStatus === 'reviewing').length || 0;
    const learningCount = totalCards - masteredCount - reviewingCount;
    const masteryPct = totalCards > 0 ? Math.round((masteredCount / totalCards) * 100) : 0;

    return (
      <div className="p-6 space-y-6">
        {/* Header with Navigation and Mastery Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 no-print">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedSet(null)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sets
            </button>
            <button
              onClick={handlePrintDeck}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              title="Print / Export Deck to PDF"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Export Deck PDF</span>
            </button>
          </div>

          {/* Mastery Progress Bar */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="flex items-center gap-1.5 justify-end text-xs font-bold text-slate-800 dark:text-white">
                <Award className="h-3.5 w-3.5 text-amber-500" />
                <span>Deck Mastery: {masteryPct}%</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {masteredCount} Mastered • {reviewingCount} Reviewing • {learningCount} Learning
              </p>
            </div>
            <div className="w-24 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700">
              <div
                className="h-full bg-slate-900   transition-all duration-500"
                style={{ width: `${masteryPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card Counter & SRS Scheduling Pill */}
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          <span className="font-semibold text-slate-800 dark:text-white">
            Card {totalCards ? currentCardIndex + 1 : 0} of {totalCards}
          </span>
          {currentCard && (
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full font-semibold text-[11px] flex items-center gap-1 border ${
                currentCard.masteryStatus === 'mastered'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : currentCard.masteryStatus === 'reviewing'
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
              }`}>
                {currentCard.masteryStatus === 'mastered' && '🏆 Mastered'}
                {currentCard.masteryStatus === 'reviewing' && '🔄 Reviewing'}
                {(!currentCard.masteryStatus || currentCard.masteryStatus === 'learning') && '🌱 Learning'}
              </span>

              {currentCard.nextReviewDate && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono">
                  <Calendar className="h-3 w-3" />
                  Due {moment(currentCard.nextReviewDate).fromNow()}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Active Flashcard */}
        {currentCard ? (
          <div className="printable-card">
            <Flashcard key={currentCard._id || currentCardIndex} flashcard={currentCard} onToggleStar={() => handleToggle(currentCard._id)} />
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-6 text-center text-slate-600 dark:text-slate-400">
            No cards available in this set.
          </div>
        )}

        {/* Spaced Repetition (SRS) Rating Action Bar */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 p-4 space-y-2 no-print">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 text-center uppercase tracking-wider">
            Rate Retention for Spaced Repetition (SRS)
          </p>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => handleSRSReview('hard')}
              disabled={srsLoading || !currentCard}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition shadow-xs disabled:opacity-50"
            >
              <span className="text-xs font-bold">Hard</span>
              <span className="text-[10px] text-rose-500 dark:text-rose-400">Review in 1 Day</span>
            </button>

            <button
              type="button"
              onClick={() => handleSRSReview('medium')}
              disabled={srsLoading || !currentCard}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition shadow-xs disabled:opacity-50"
            >
              <span className="text-xs font-bold">Good</span>
              <span className="text-[10px] text-amber-500 dark:text-amber-400">Review in 3 Days</span>
            </button>

            <button
              type="button"
              onClick={() => handleSRSReview('easy')}
              disabled={srsLoading || !currentCard}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition shadow-xs disabled:opacity-50"
            >
              <span className="text-xs font-bold">Easy</span>
              <span className="text-[10px] text-emerald-500 dark:text-emerald-400">Review in 7 Days</span>
            </button>
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center justify-between gap-3 no-print">
          <button
            type="button"
            onClick={handlePreviousCard}
            disabled={!totalCards}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>

          <span className="text-xs text-slate-400 dark:text-slate-500">
            Tip: Click card to flip and reveal answer
          </span>

          <button
            type="button"
            onClick={handleNextCard}
            disabled={!totalCards}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  const renderSetList = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      )
    }

    if (flashcardSets.length === 0) {
      return (
        <div className="p-8 flex flex-col items-center text-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50">
          <div className="h-12 w-12 rounded-xl bg-blue-50/80 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center shadow-xs">
            <LogoIcon className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No flashcard sets yet</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Generate flashcards from your document to start learning with spaced repetition.</p>
          </div>
          <button
            onClick={handleGnerateFlashcards}
            disabled={generating}
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-white text-sm font-semibold shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition"
          >
            {generating ? (
              <><Spinner size="sm" /> Generating...</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Generate Flashcards</>
            )}
          </button>
        </div>
      )
    }

    return (
      <div>
        <div className="mb-4 flex items-center justify-between gap-3 p-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Your Flashcard Decks</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{flashcardSets.length} sets with Spaced Repetition (SRS)</p>
          </div>
          <button
            onClick={handleGnerateFlashcards}
            disabled={generating}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-white text-xs font-semibold shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition"
          >
            {generating ? (
              <><Spinner size="sm" /> Generating...</>
            ) : (
              <><Plus className="h-4 w-4" /> Generate New Deck</>
            )}
          </button>
        </div>

        {/* Set Grid */}
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 px-4 mb-4">
          {flashcardSets.map((set) => {
            const total = set.cards?.length || 0;
            const mastered = set.cards?.filter(c => c.masteryStatus === 'mastered').length || 0;
            const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;

            return (
              <div
                key={set._id}
                onClick={() => handleSelectSet(set)}
                className="group cursor-pointer rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs transition hover:-translate-y-1 hover:shadow-md dark:shadow-slate-950/40 space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50/80 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/50">
                    <LogoIcon className="h-6 w-6" />
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteRequest(e, set)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                    aria-label="Delete flashcard set"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-1">
                  <h4 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1">
                    {set.documentId?.title || "Flashcard Deck"}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Created {moment(set.createdAt).fromNow()}
                  </p>
                </div>

                {/* Mastery Mini Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    <span>Mastery</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{pct}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {total} {total === 1 ? "card" : "cards"}
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold group-hover:underline">
                    Study with SRS →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {selectedSet ? renderFlashcardView() : renderSetList()}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Flashcard Deck"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete this deck? All SRS review progress and interval schedules will be lost.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="px-4 py-2 rounded-xl bg-rose-600 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete Deck'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FlashcardManager;
