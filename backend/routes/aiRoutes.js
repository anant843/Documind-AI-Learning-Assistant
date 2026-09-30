import express from 'express';

import {
    generateFlashcards,
    generateQuiz,
    generateSummary,
    chat,
    explainConcept,
    getChatHistory,
    multiChat,
    getMultiChatHistory,
    clearMultiChatHistory,
    generateNotes,
    generateMindMap,
    generatePresentationHandler,
    generateWeakTopicQuiz,
    compareDocumentsHandler,
    startInterview,
    answerInterviewQuestion,
} from '../controllers/aiController.js';
import protect from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/generate-flashcards', generateFlashcards);
router.post('/generate-quiz', generateQuiz);
router.post('/generate-summary', generateSummary);
router.post('/generate-notes', generateNotes);
router.post('/generate-mindmap', generateMindMap);
router.post('/presentation/:documentId', generatePresentationHandler);
router.post('/weak-topic-quiz', generateWeakTopicQuiz);
router.post('/compare-documents', compareDocumentsHandler);
router.post('/interview/start', startInterview);
router.post('/interview/answer', answerInterviewQuestion);
router.post('/chat', chat);
router.post('/multi-chat', multiChat);
router.get('/multi-chat/history', getMultiChatHistory);
router.delete('/multi-chat/history', clearMultiChatHistory);
router.post('/explain-concept', explainConcept);
router.get('/chat-history/:documentId', getChatHistory);

export default router;