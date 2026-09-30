import React, { useState, useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import flashcardService from '../../services/flashcardService'
import aiService from '../../services/aiService'
import PageHeader from '../../Components/common/PageHeader'
import Spinner from '../../Components/common/Spinner'
import EmptyState from '../../Components/common/EmptyState'
import Button from '../../Components/common/Button'
import Modal from '../../Components/common/Modal'
import Flashcard from '../../Components/flashcard/Flashcard'

// Simplified single-set flashcard page with cleaned layout.
const FlashcardPage = () => {
  const { id: documentId } = useParams()
  const [flashcardSet, setFlashcardSet] = useState(null)
  const [flashcards, setFlashcards] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const hasCards = useMemo(() => flashcards.length > 0, [flashcards])

  const fetchFlashcards = async () => {
    setLoading(true)
    try {
      const res = await flashcardService.getFlashcardsForDocument(documentId)
      const firstSet = res.data?.[0]
      setFlashcardSet(firstSet || null)
      setFlashcards(firstSet?.cards || [])
      setCurrentCardIndex(0)
    } catch (error) {
      toast.error(error.message || 'Failed to load flashcards')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (documentId) fetchFlashcards()
  }, [documentId])

  const handleGenerateFlashcards = async () => {
    setGenerating(true)
    try {
      await aiService.generateFlashcards(documentId)
      toast.success('Flashcards generated successfully')
      fetchFlashcards()
    } catch (error) {
      toast.error(error.message || 'Failed to generate flashcards')
    } finally {
      setGenerating(false)
    }
  }

  const handleReview = async (index) => {
    const card = flashcards[index]
    if (!card) return
    try {
      await flashcardService.reviewFlashcard(card._id, index)
    } catch (error) {
      toast.error(error.message || 'Failed to review flashcard')
    }
  }

  const handleNextCard = () => {
    if (!hasCards) return
    handleReview(currentCardIndex)
    setCurrentCardIndex((prev) => (prev + 1) % flashcards.length)
  }

  const handlePrevCard = () => {
    if (!hasCards) return
    handleReview(currentCardIndex)
    setCurrentCardIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length)
  }

  const handleToggleStar = async (cardId) => {
    try {
      await flashcardService.toggleStarFlashcard(cardId)
      setFlashcards((prevCards) =>
        prevCards.map((card) =>
          card._id === cardId ? { ...card, isStarred: !card.isStarred } : card
        )
      )
    } catch (error) {
      toast.error(error.message || 'Failed to toggle star')
    }
  }

  const handleDeleteFlashcardSet = async () => {
    if (!flashcardSet?._id) return
    setDeleting(true)
    try {
      await flashcardService.deleteFlashcardSet(flashcardSet._id)
      toast.success('Flashcard set deleted successfully')
      setIsDeleteModalOpen(false)
      setFlashcardSet(null)
      setFlashcards([])
    } catch (error) {
      toast.error(error.message || 'Failed to delete flashcard set')
    } finally {
      setDeleting(false)
    }
  }

  const [srsLoading, setSrsLoading] = useState(false)

  const handleSRSReview = async (rating) => {
    const currentCard = flashcards[currentCardIndex]
    if (!currentCard || srsLoading) return

    setSrsLoading(true)
    try {
      const res = await flashcardService.reviewFlashcardSRS(currentCard._id, rating)
      const updatedSet = res.data
      setFlashcardSet(updatedSet)
      setFlashcards(updatedSet.cards || [])

      const days = rating === 'easy' ? 7 : rating === 'medium' ? 3 : 1
      toast.success(`Scheduled for review in ${days} day${days > 1 ? 's' : ''}! +10 XP 🔥`)

      if (currentCardIndex < (updatedSet.cards?.length || 0) - 1) {
        setCurrentCardIndex((prev) => prev + 1)
      }
    } catch (error) {
      toast.error(error.message || 'Failed to submit SRS review')
    } finally {
      setSrsLoading(false)
    }
  }

  const renderFlashcardContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-[50vh]">
          <Spinner size="lg" />
        </div>
      )
    }

    if (!hasCards) {
      return (
        <div className="flex flex-col items-center gap-4 p-8 text-center">
          <EmptyState
            title="No Flashcards"
            description="Generate flashcards for this document to start practicing."
          />
          <Button onClick={handleGenerateFlashcards} disabled={generating}>
            {generating ? <Spinner size="sm" /> : <><Plus className="mr-2 h-4 w-4" /> Generate Flashcards</>}
          </Button>
        </div>
      )
    }

    const currentCard = flashcards[currentCardIndex]

    return (
      <div className="flex flex-col items-center gap-6">
        <Flashcard key={currentCard?._id || currentCardIndex} flashcard={currentCard} onToggleStar={handleToggleStar} />

        {/* SRS Rating Action Bar */}
        <div className="w-full max-w-xl md:max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 p-4 space-y-2">
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
        <div className="flex items-center gap-4">
          <Button
            variant="secondary"
            onClick={handlePrevCard}
            disabled={flashcards.length <= 1}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{`${currentCardIndex + 1} / ${flashcards.length}`}</span>
          <Button
            variant="secondary"
            onClick={handleNextCard}
            disabled={flashcards.length <= 1}
          >
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={`/documents/${documentId}`}
          className="inline-flex items-center text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Document
        </Link>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <PageHeader
          title="Flashcards"
          subtitle="Quickly review your generated cards with spaced repetition."
        />
        <div className="flex items-center gap-2">
          <Button onClick={handleGenerateFlashcards} disabled={generating}>
            {generating ? <Spinner size="sm" /> : <><Plus className="mr-2 h-4 w-4" /> Generate Flashcards</>}
          </Button>
          {hasCards && (
            <Button
              variant="outline"
              className="border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
              onClick={() => setIsDeleteModalOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Set
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        {renderFlashcardContent()}
      </div>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Delete"
      >
        <div className="space-y-4">
          <p>Are you sure you want to delete this flashcard set? This action cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              className="bg-red-600 hover:bg-red-700 focus:ring-red-500/50"
              disabled={deleting}
              onClick={handleDeleteFlashcardSet}
            >
              {deleting ? <Spinner size="sm" /> : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default FlashcardPage