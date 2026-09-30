import mongoose from "mongoose";

const citationSchema = new mongoose.Schema({
    documentId: {
        type: String,
        required: true
    },
    documentName: {
        type: String,
        required: true
    },
    documentTitle: {
        type: String,
        default: ''
    },
    page: {
        type: Number,
        required: true,
        default: 1
    },
    pageNumber: {
        type: Number,
        default: 1
    },
    chunkId: {
        type: String,
        required: true
    },
    chunkIndex: {
        type: Number,
        default: 0
    },
    chunkText: {
        type: String,
        required: true
    },
    snippet: {
        type: String,
        default: ''
    },
    relevanceScore: {
        type: Number,
        default: 0.95
    },
    similarityScore: {
        type: Number,
        default: 0.95
    }
}, { _id: false });

const retrievalMetadataSchema = new mongoose.Schema({
    topScore: {
        type: Number,
        default: 0
    },
    confidence: {
        type: String,
        enum: ['high', 'medium', 'low', 'none'],
        default: 'high'
    },
    chunksEvaluated: {
        type: Number,
        default: 0
    },
    lowConfidenceWarning: {
        type: String,
        default: ''
    }
}, { _id: false });

const messageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['user', 'assistant'],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    relevantChunk: {
        type: [Number],
        default: []
    },
    citations: [citationSchema],
    retrievalMetadata: retrievalMetadataSchema
}, { _id: true });

const chatHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
        required: false
    },
    sessionType: {
        type: String,
        enum: ['single', 'multi'],
        default: 'single'
    },
    messages: [messageSchema]
}, {
    timestamps: true
});

chatHistorySchema.index({ userId: 1, documentId: 1 });
chatHistorySchema.index({ userId: 1, sessionType: 1 });

const ChatHistory = mongoose.model('ChatHistory', chatHistorySchema);
export default ChatHistory;