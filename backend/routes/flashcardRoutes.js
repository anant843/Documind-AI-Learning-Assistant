import express from 'express';

import {
    getFlashcards,
    getAllFlashcardSets,
    getDueFlashcards,
    reviewFlashcards,
    reviewFlashcardSRS,
    toggleStarFlashcard,
    deleteFlashcardSet,
} from '../controllers/flashcardController.js';

import protect from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getAllFlashcardSets);
router.get('/due/cards', getDueFlashcards);
router.get('/:documentId', getFlashcards);
router.post('/:cardId/review', reviewFlashcards);
router.post('/:cardId/review-srs', reviewFlashcardSRS);
router.post('/:cardId/star', toggleStarFlashcard);
router.delete('/:id', deleteFlashcardSet);

export default router;
