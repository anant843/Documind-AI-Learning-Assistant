import mongoose from "mongoose";

const studyHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    originalDocumentId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    documentTitle: {
        type: String,
        required: true
    },
    filename: {
        type: String,
        default: ''
    },
    fileHash: {
        type: String,
        default: '',
        index: true
    },
    extractedText: {
        type: String,
        default: ''
    },
    chunks: [{
        content: String,
        pageNumber: Number,
        chunkIndex: Number,
        embedding: [Number]
    }],
    fullFlashcardSets: {
        type: mongoose.Schema.Types.Mixed,
        default: []
    },
    fullQuizzes: {
        type: mongoose.Schema.Types.Mixed,
        default: []
    },
    deletedAt: {
        type: Date,
        default: Date.now
    },
    // Archived Flashcard statistics & cards
    totalFlashcards: {
        type: Number,
        default: 0
    },
    masteredFlashcards: {
        type: Number,
        default: 0
    },
    reviewedFlashcards: {
        type: Number,
        default: 0
    },
    flashcardsMastery: {
        type: Number,
        default: 0
    },
    flashcardSets: [{
        title: String,
        cardsCount: Number,
        masteredCount: Number,
        cards: [{
            question: String,
            answer: String,
            difficulty: String,
            masteryStatus: String
        }]
    }],
    // Archived Quiz statistics & attempts
    quizzesCount: {
        type: Number,
        default: 0
    },
    completedQuizzesCount: {
        type: Number,
        default: 0
    },
    averageQuizScore: {
        type: Number,
        default: 0
    },
    highestQuizScore: {
        type: Number,
        default: 0
    },
    quizzes: [{
        quizId: String,
        title: String,
        score: Number,
        totalQuestions: Number,
        completedAt: Date,
        userAnswersCount: Number
    }]
}, {
    timestamps: true
});

studyHistorySchema.index({ userId: 1, deletedAt: -1 });

const StudyHistory = mongoose.model('StudyHistory', studyHistorySchema);
export default StudyHistory;
