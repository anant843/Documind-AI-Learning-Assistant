import Flashcard from "../models/Flashcard.js";
import { awardUserXP } from "../utils/gamificationService.js";

const enrichSetMastery = (set) => {
    const plain = set.toObject ? set.toObject() : { ...set };
    const total = plain.cards ? plain.cards.length : 0;
    if (total === 0) {
        plain.masteryPercentage = 0;
        plain.masteredCount = 0;
        plain.reviewingCount = 0;
        plain.learningCount = 0;
        return plain;
    }
    const masteredCount = plain.cards.filter(c => c.masteryStatus === 'mastered').length;
    const reviewingCount = plain.cards.filter(c => c.masteryStatus === 'reviewing').length;
    const learningCount = total - masteredCount - reviewingCount;

    plain.masteryPercentage = Math.round((masteredCount / total) * 100);
    plain.masteredCount = masteredCount;
    plain.reviewingCount = reviewingCount;
    plain.learningCount = learningCount;
    return plain;
};

// @desc    get all flashcards for a document
// @route   GET /api/flashcards/:documentId
// @access  Private
export const getFlashcards = async (req, res, next) => {
    try {
        const flashcards = await Flashcard.find({
            userId: req.user._id,
            documentId: req.params.documentId
        }).populate('documentId', 'title filename').sort({ createdAt: -1 });

        const enriched = flashcards.map(enrichSetMastery);

        res.status(200).json({
            success: true,
            count: enriched.length,
            data: enriched,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    get all flashcard sets for a user
// @route   GET /api/flashcards/
// @access  Private
export const getAllFlashcardSets = async (req, res, next) => {
    try {
        const flashcardSets = await Flashcard.find({
            userId: req.user._id,
        }).populate('documentId', 'title').sort({ createdAt: -1 });

        const enriched = flashcardSets.map(enrichSetMastery);

        res.status(200).json({
            success: true,
            count: enriched.length,
            data: enriched,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    get flashcards due for review today
// @route   GET /api/flashcards/due/cards
// @access  Private
export const getDueFlashcards = async (req, res, next) => {
    try {
        const now = new Date();
        const flashcardSets = await Flashcard.find({
            userId: req.user._id,
        }).populate('documentId', 'title');

        const dueCards = [];

        flashcardSets.forEach(set => {
            (set.cards || []).forEach(card => {
                // Due if never reviewed or nextReviewDate <= now
                if (!card.nextReviewDate || new Date(card.nextReviewDate) <= now) {
                    dueCards.push({
                        ...card.toObject(),
                        setId: set._id,
                        documentTitle: set.documentId?.title || 'Study Material'
                    });
                }
            });
        });

        res.status(200).json({
            success: true,
            count: dueCards.length,
            data: dueCards
        });
    } catch (error) {
        next(error);
    }
};

// @desc    mark flashcard as reviewed (simple)
// @route   POST /api/flashcards/:cardId/review
// @access  Private
export const reviewFlashcards = async (req, res, next) => {
    try {
        const flashcard = await Flashcard.findOne({
            'cards._id': req.params.cardId,
            userId: req.user._id
        });

        if (!flashcard) {
            return res.status(404).json({ success: false, error: 'Flashcard not found', statusCode: 404 });
        }

        const cardIndex = flashcard.cards.findIndex(card => card._id.toString() === req.params.cardId);
        if (cardIndex === -1) {
            return res.status(404).json({ success: false, error: 'Card not found in flashcard set', statusCode: 404 });
        }

        // update review info
        flashcard.cards[cardIndex].lastReviewed = Date.now();
        flashcard.cards[cardIndex].reviewCount += 1;

        await flashcard.save();
        await awardUserXP(req.user._id, 10, 'flashcard_review', { totalReviewed: flashcard.cards[cardIndex].reviewCount });

        res.status(200).json({
            success: true,
            data: enrichSetMastery(flashcard),
            message: 'Flashcard reviewed successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    review flashcard with Spaced Repetition (SRS)
// @route   POST /api/flashcards/:cardId/review-srs
// @access  Private
export const reviewFlashcardSRS = async (req, res, next) => {
    try {
        const { rating } = req.body; // 'easy' | 'medium' | 'hard'
        const flashcard = await Flashcard.findOne({
            'cards._id': req.params.cardId,
            userId: req.user._id
        });

        if (!flashcard) {
            return res.status(404).json({ success: false, error: 'Flashcard not found', statusCode: 404 });
        }

        const cardIndex = flashcard.cards.findIndex(card => card._id.toString() === req.params.cardId);
        if (cardIndex === -1) {
            return res.status(404).json({ success: false, error: 'Card not found in flashcard set', statusCode: 404 });
        }

        const card = flashcard.cards[cardIndex];
        const now = new Date();

        card.lastReviewed = now;
        card.reviewCount += 1;
        card.repetitionCount = (card.repetitionCount || 0) + 1;

        let intervalDays = 1;
        if (rating === 'easy') {
            intervalDays = 7;
            card.masteryStatus = 'mastered';
            card.easeFactor = Math.min((card.easeFactor || 2.5) + 0.15, 3.0);
        } else if (rating === 'medium') {
            intervalDays = 3;
            card.masteryStatus = 'reviewing';
        } else {
            // hard
            intervalDays = 1;
            card.masteryStatus = 'learning';
            card.easeFactor = Math.max((card.easeFactor || 2.5) - 0.2, 1.3);
        }

        card.intervalDays = intervalDays;
        card.nextReviewDate = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

        await flashcard.save();

        // Award XP
        const xpResult = await awardUserXP(req.user._id, 10, 'flashcard_review', {
            totalReviewed: card.reviewCount
        });

        if (card.masteryStatus === 'mastered') {
            await awardUserXP(req.user._id, 15, 'flashcard_mastered');
        }

        res.status(200).json({
            success: true,
            data: enrichSetMastery(flashcard),
            updatedCard: card,
            xpResult,
            message: `SRS review saved. Next review scheduled in ${intervalDays} day${intervalDays > 1 ? 's' : ''}.`
        });
    } catch (error) {
        next(error);
    }
};

// @desc    toggle star on flashcard
// @route   POST /api/flashcards/:cardId/star
// @access  Private
export const toggleStarFlashcard = async (req, res, next) => {
    try {
        const flashcardSet = await Flashcard.findOne({
            'cards._id': req.params.cardId,
            userId: req.user._id
        });
        if (!flashcardSet) {
            return res.status(404).json({ success: false, error: 'Flashcard not found', statusCode: 404 });
        }

        const cardIndex = flashcardSet.cards.findIndex(card => card._id.toString() === req.params.cardId);
        if (cardIndex === -1) {
            return res.status(404).json({ success: false, error: 'Card not found in flashcard set', statusCode: 404 });
        }

        // toggle star
        flashcardSet.cards[cardIndex].isStarred = !flashcardSet.cards[cardIndex].isStarred;

        await flashcardSet.save();
        res.status(200).json({
            success: true,
            data: enrichSetMastery(flashcardSet),
            message: 'Flashcard star status toggled successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    delete flashcard set
// @route   DELETE /api/flashcards/:id
// @access  Private
export const deleteFlashcardSet = async (req, res, next) => {
    try {
        const flashcardSet = await Flashcard.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!flashcardSet) {
            return res.status(404).json({ success: false, error: 'Flashcard set not found', statusCode: 404 });
        }
        await flashcardSet.deleteOne();
        res.status(200).json({
            success: true,
            message: 'Flashcard set deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
