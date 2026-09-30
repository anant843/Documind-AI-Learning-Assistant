import Document from "../models/Document.js";
import Flashcard from "../models/Flashcard.js";
import Quiz from "../models/Quiz.js";
import ChatHistory from "../models/ChatHistory.js";
import * as geminiService from '../utils/geminiService.js';
import { findRelevantChunks, chunkText } from "../utils/textChunker.js";
import { searchSimilarChunks } from "../utils/embeddingService.js";
import { awardUserXP } from "../utils/gamificationService.js";
import { ensureDocumentHasAccurateChunks } from "./documentController.js";


// @desc    Generate flashcard for a document
// @route   POST /api/ai/generate-flashcards
// @access  Private
export const generateFlashcards = async (req, res, next) => {

    try {
        const { documentId, count = 10 } = req.body;

        if (!documentId) {
            return res.status(400).json({ success: false, error: 'Document ID is required', statusCode: 400 });
        }

        const document = await Document.findOne({
            _id: documentId,
            userId: req.user._id,
            status: 'ready'
        });

        if (!document) {
            return res.status(404).json({ success: false, error: 'Document not found or not ready', statusCode: 404 });
        }

        // Generate flashcards using geminiService
        const cards = await geminiService.generateFlashcards(document.extractedText, parseInt(count));

        //save to database
        const flashcardSets = await Flashcard.create({
            userId: req.user._id,
            documentId: document._id,
            cards: cards.map(card => ({
                question: card.question,
                answer: card.answer,
                difficulty: card.difficulty,
                reviewCount: 0,
                isStarred: false,
            }))
        });

        res.status(200).json({
            success: true,
            data: flashcardSets,
            message: 'Flashcards generated successfully'
        });



    } catch (error) {
        next(error);
    }
}


// @desc    Generate quiz for a document
// @route   POST /api/ai/generate-quiz
// @access  Private

export const generateQuiz = async (req, res, next) => {
    try {

        const requestedCount = req.body.numQuestions || req.body.questionCount || req.body.count || req.body.totalQuestions || 5;
        const targetCount = Math.max(1, Math.min(20, parseInt(requestedCount, 10) || 5));
        const { documentId, title } = req.body;

        if (!documentId) {
            return res.status(400).json({ success: false, error: 'Document ID is required', statusCode: 400 });
        }

        const document = await Document.findOne({
            _id: documentId,
            userId: req.user._id,
            status: 'ready'
        });

        if (!document) {
            return res.status(404).json({ success: false, error: 'Document not found or not ready', statusCode: 404 });
        }

        // Generate quiz using geminiService with educational filtering
        const contextSource = (document.chunks && document.chunks.length > 0) ? document.chunks : document.extractedText;
        const questions = await geminiService.generateQuiz(contextSource, targetCount);

        if (!questions || !Array.isArray(questions) || questions.length === 0) {
            return res.status(500).json({ success: false, error: 'Failed to generate valid quiz questions', statusCode: 500 });
        }

        // Save to database
        const quiz = await Quiz.create({
            userId: req.user._id,
            documentId: document._id,
            title: title || `Quiz for ${document.title}`,
            questions: questions,
            totalQuestions: questions.length,
            userAnswer: [],
            score: 0,
        });

        console.log(`[Quiz Controller] Created quiz "${quiz.title}" with ${quiz.questions.length} questions for user ${req.user._id}`);

        res.status(200).json({
            success: true,
            data: quiz,
            message: 'Quiz generated successfully'
        });
    } catch (error) {
        next(error);
    }
}

// @desc    Generate summary for a document
// @route   POST /api/ai/generate-summary
// @access  Private
export const generateSummary = async (req, res, next) => {
    try {
        const { documentId } = req.body;
        if (!documentId) {
            return res.status(400).json({ success: false, error: 'Document ID is required', statusCode: 400 });
        }

        const document = await Document.findOne({
            _id: documentId,
            userId: req.user._id,
            status: 'ready'
        });

        if (!document) {
            return res.status(404).json({ success: false, error: 'Document not found or not ready', statusCode: 404 });
        }

        // Generate summary using geminiService
        const summary = await geminiService.generateSummary(document.extractedText);

        res.status(200).json({
            success: true,
            data: {
                documentId: document._id,
                title: document.title,
                summary
            },
            message: 'Summary generated successfully'
        });

    } catch (error) {
        next(error);
    }
}

// @desc    Chat with document
// @route   POST /api/ai/chat
// @access  Private
export const chat = async (req, res, next) => {
    try {
        const { documentId, question } = req.body;

        if (!documentId || !question) {
            return res.status(400).json({ success: false, error: 'Document ID and question are required', statusCode: 400 });
        }

        let document = await Document.findOne({
            _id: documentId,
            userId: req.user._id,
            status: 'ready'
        });

        if (!document) {
            return res.status(404).json({ success: false, error: 'Document not found or not ready', statusCode: 404 });
        }

        // Ensure document chunks have exact PDF page mappings
        document = await ensureDocumentHasAccurateChunks(document);

        // Find relevant chunks using Hybrid Vector + Keyword Search
        const chunks = await searchSimilarChunks(question, document.chunks, 5);
        const topScore = chunks.length > 0 ? Math.max(...chunks.map(c => c.similarityScore || 0)) : 0;

        // Generate response with grounded citation tracking from geminiService
        const result = await geminiService.chatWithContext(question, chunks);
        const answerText = typeof result === 'object' ? result.answer : result;
        const usedIndices = typeof result === 'object' && Array.isArray(result.usedChunkIndices)
            ? result.usedChunkIndices
            : [1];

        const notFoundPhrases = [
            "could not find this information",
            "not available in the uploaded",
            "not found in the uploaded"
        ];
        const isNotFound = notFoundPhrases.some(p => (answerText || '').toLowerCase().includes(p)) || usedIndices.length === 0;

        // Filter chunks to only those actually supporting the final answer
        let finalUsedChunks = [];
        if (!isNotFound) {
            finalUsedChunks = usedIndices
                .map(idx => chunks[idx - 1])
                .filter(Boolean);

            if (finalUsedChunks.length === 0 && chunks.length > 0) {
                finalUsedChunks = [chunks[0]];
            }
        }

        // Build rich citation metadata with true page numbers
        const citations = finalUsedChunks.map((c, idx) => {
            const pNum = (c && typeof c.pageNumber === 'number' && c.pageNumber > 0)
                ? c.pageNumber
                : (c?.page || 1);

            const cIdx = typeof c.chunkIndex === 'number' ? c.chunkIndex : idx;
            const fullContent = (c.content || '').trim();

            return {
                documentId: document._id.toString(),
                documentName: document.filename || document.title,
                documentTitle: document.title,
                page: pNum,
                pageNumber: pNum,
                chunkId: `chunk_${cIdx}`,
                chunkIndex: cIdx,
                chunkText: fullContent,
                snippet: fullContent.length > 250 ? fullContent.substring(0, 250).trim() + '...' : fullContent,
                relevanceScore: Number((c.similarityScore || 0.95).toFixed(4)),
                similarityScore: Number((c.similarityScore || 0.95).toFixed(4))
            };
        });

        // Determine retrieval confidence
        const isLowConfidence = !isNotFound && topScore < 0.35;
        const confidenceLevel = isNotFound ? 'none' : (isLowConfidence ? 'low' : 'high');
        const lowConfidenceWarning = isLowConfidence
            ? "Answer may be incomplete because limited supporting information was found."
            : '';

        const retrievalMetadata = {
            topScore: Number(topScore.toFixed(4)),
            confidence: confidenceLevel,
            chunksEvaluated: chunks.length,
            lowConfidenceWarning
        };

        // Get or create chat history
        let chatHistory = await ChatHistory.findOne({
            userId: req.user._id,
            documentId: document._id
        });

        if (!chatHistory) {
            chatHistory = await ChatHistory.create({
                userId: req.user._id,
                documentId: document._id,
                sessionType: 'single',
                messages: []
            });
        }

        // Save conversation with citations and retrieval metadata
        chatHistory.messages.push(
            {
                role: 'user',
                content: question,
                timestamp: new Date(),
                relevantChunk: []
            },
            {
                role: 'assistant',
                content: answerText,
                timestamp: new Date(),
                relevantChunk: finalUsedChunks.map(c => c.chunkIndex),
                citations,
                retrievalMetadata
            }
        );
        await chatHistory.save();

        res.status(200).json({
            success: true,
            data: {
                question,
                answer: answerText,
                citations,
                retrievalMetadata,
                chatHistoryId: chatHistory._id
            },
            message: 'Grounded chat response generated successfully with citations'
        });
    } catch (error) {
        next(error);
    }
};


// @desc    Explain concept
// @route   POST /api/ai/explain-concept
// @access  Private
export const explainConcept = async (req, res, next) => {
    try {
        const { documentId, concept } = req.body;

        if (!documentId || !concept || concept.trim().length === 0) {
            return res.status(400).json({ success: false, error: 'Document ID and concept are required', statusCode: 400 });
        }

        let document = await Document.findOne({
            _id: documentId,
            userId: req.user._id,
            status: 'ready'
        });
        if (!document) {
            return res.status(404).json({ success: false, error: 'Document not found or not ready', statusCode: 404 });
        }

        // Ensure document has accurate chunks and embeddings
        document = await ensureDocumentHasAccurateChunks(document);

        // Find relevant chunks using Hybrid Vector + Keyword Search
        const relevantChunks = await searchSimilarChunks(concept, document.chunks, 6);
        
        let context = '';
        if (relevantChunks && relevantChunks.length > 0) {
            context = relevantChunks
                .map(c => `[Page ${c.pageNumber || 1}]:\n${(c.content || '').trim()}`)
                .join('\n\n');
        }

        // If context is still short or empty, provide the extracted document text directly
        if (!context || context.length < 200) {
            context = (document.extractedText || '').substring(0, 15000);
        }

        // Generate strictly grounded explanation from geminiService
        const explanation = await geminiService.explainConcept(concept, context, document.title);

        res.status(200).json({
            success: true,
            data: {
                concept,
                explanation,
                documentTitle: document.title,
                relevantChunks: relevantChunks.map(c => c.chunkIndex)
            },
            message: 'Concept explanation generated successfully from document'
        });

    } catch (error) {
        next(error);
    }
};


// @desc    Get chat history for a document
// @route   GET /api/ai/chat-history/:documentId
// @access  Private
export const getChatHistory = async (req, res, next) => {
    try {
        const { documentId } = req.params;

        if (!documentId) {
            return res.status(400).json({ success: false, error: 'Document ID is required', statusCode: 400 });
        }

        const chatHistory = await ChatHistory.findOne({
            userId: req.user._id,
            documentId: documentId
        });

        if (!chatHistory) {
            return res.status(200).json({ success: true, data: [], message: 'No chat history yet' });
        }

        res.status(200).json({
            success: true,
            data: chatHistory.messages,
            message: 'Chat history retrieved successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Multi-document RAG Chat across multiple or all documents
// @route   POST /api/ai/multi-chat
// @access  Private
export const multiChat = async (req, res, next) => {
    try {
        const { question, documentIds } = req.body;

        if (!question || question.trim().length === 0) {
            return res.status(400).json({ success: false, error: 'Question is required', statusCode: 400 });
        }

        let queryFilter = {
            userId: req.user._id,
            status: 'ready'
        };

        if (Array.isArray(documentIds) && documentIds.length > 0) {
            queryFilter._id = { $in: documentIds };
        }

        const documents = await Document.find(queryFilter);

        if (!documents || documents.length === 0) {
            return res.status(404).json({ success: false, error: 'No documents available for search', statusCode: 404 });
        }

        // Flatten all chunks across user's documents
        const allChunks = [];
        for (let doc of documents) {
            doc = await ensureDocumentHasAccurateChunks(doc);
            const docChunks = doc.chunks || [];

            if (Array.isArray(docChunks)) {
                docChunks.forEach(chunk => {
                    const chunkObj = chunk.toObject ? chunk.toObject() : chunk;
                    const pNum = (chunkObj && typeof chunkObj.pageNumber === 'number' && chunkObj.pageNumber > 0)
                        ? chunkObj.pageNumber
                        : (chunkObj?.page || 1);

                    allChunks.push({
                        ...chunkObj,
                        documentId: doc._id.toString(),
                        documentTitle: doc.title,
                        pageNumber: pNum
                    });
                });
            }
        }

        if (allChunks.length === 0) {
            return res.status(400).json({ success: false, error: 'Documents contain no indexed chunks', statusCode: 400 });
        }

        // Semantic vector search across all documents
        const topChunks = await searchSimilarChunks(question, allChunks, 6);
        const topScore = topChunks.length > 0 ? Math.max(...topChunks.map(c => c.similarityScore || 0)) : 0;

        // Format chunks with document attribution for context
        const contextChunks = topChunks.map(c => ({
            ...c,
            content: `[Document: "${c.documentTitle}", Page ${c.pageNumber || 1}]:\n${c.content}`
        }));

        // Generate grounded answer
        const result = await geminiService.chatWithContext(question, contextChunks);
        const answerText = typeof result === 'object' ? result.answer : result;
        const usedIndices = typeof result === 'object' && Array.isArray(result.usedChunkIndices)
            ? result.usedChunkIndices
            : [1];

        const notFoundPhrases = [
            "could not find this information",
            "not available in the uploaded",
            "not found in the uploaded"
        ];
        const isNotFound = notFoundPhrases.some(p => (answerText || '').toLowerCase().includes(p)) || usedIndices.length === 0;

        let finalUsedChunks = [];
        if (!isNotFound) {
            finalUsedChunks = usedIndices
                .map(idx => topChunks[idx - 1])
                .filter(Boolean);

            if (finalUsedChunks.length === 0 && topChunks.length > 0) {
                finalUsedChunks = [topChunks[0]];
            }
        }

        // Format rich citations with true page numbers
        const citations = finalUsedChunks.map((c, idx) => {
            const pNum = (c && typeof c.pageNumber === 'number' && c.pageNumber > 0)
                ? c.pageNumber
                : (c?.page || 1);

            const cIdx = typeof c.chunkIndex === 'number' ? c.chunkIndex : idx;
            const fullContent = (c.content || '').trim();

            return {
                documentId: c.documentId || '',
                documentName: c.documentTitle || 'Document',
                documentTitle: c.documentTitle || 'Document',
                page: pNum,
                pageNumber: pNum,
                chunkId: `chunk_${cIdx}`,
                chunkIndex: cIdx,
                chunkText: fullContent,
                snippet: fullContent.length > 250 ? fullContent.substring(0, 250).trim() + '...' : fullContent,
                relevanceScore: Number((c.similarityScore || 0.92).toFixed(4)),
                similarityScore: Number((c.similarityScore || 0.92).toFixed(4))
            };
        });

        // Determine retrieval confidence
        const isLowConfidence = !isNotFound && topScore < 0.35;
        const confidenceLevel = isNotFound ? 'none' : (isLowConfidence ? 'low' : 'high');
        const lowConfidenceWarning = isLowConfidence
            ? "Answer may be incomplete because limited supporting information was found."
            : '';

        const retrievalMetadata = {
            topScore: Number(topScore.toFixed(4)),
            confidence: confidenceLevel,
            chunksEvaluated: topChunks.length,
            lowConfidenceWarning
        };

        // Save in multi-document chat history
        let chatHistory = await ChatHistory.findOne({
            userId: req.user._id,
            sessionType: 'multi'
        });

        if (!chatHistory) {
            chatHistory = await ChatHistory.create({
                userId: req.user._id,
                sessionType: 'multi',
                messages: []
            });
        }

        chatHistory.messages.push(
            { role: 'user', content: question, timestamp: new Date() },
            { 
                role: 'assistant', 
                content: answerText, 
                timestamp: new Date(), 
                citations,
                retrievalMetadata
            }
        );
        await chatHistory.save();

        res.status(200).json({
            success: true,
            data: {
                question,
                answer: answerText,
                citations,
                retrievalMetadata,
                documentsUsed: [...new Set(finalUsedChunks.map(c => c.documentTitle))],
                chatHistoryId: chatHistory._id
            },
            message: 'Multi-document response generated successfully with citations'
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Get Multi-document Chat History
// @route   GET /api/ai/multi-chat/history
// @access  Private
export const getMultiChatHistory = async (req, res, next) => {
    try {
        const chatHistory = await ChatHistory.findOne({
            userId: req.user._id,
            sessionType: 'multi'
        });

        if (!chatHistory) {
            return res.status(200).json({ success: true, data: [] });
        }

        res.status(200).json({
            success: true,
            data: chatHistory.messages
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Clear Multi-document Chat History
// @route   DELETE /api/ai/multi-chat/history
// @access  Private
export const clearMultiChatHistory = async (req, res, next) => {
    try {
        await ChatHistory.deleteMany({
            userId: req.user._id,
            sessionType: 'multi'
        });

        res.status(200).json({
            success: true,
            message: 'Multi-document chat history cleared successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Generate Study Notes (Short Notes, Exam Notes, Revision Sheet)
// @route   POST /api/ai/generate-notes
// @access  Private
export const generateNotes = async (req, res, next) => {
    try {
        const { documentId } = req.body;
        if (!documentId) {
            return res.status(400).json({ success: false, error: 'Document ID is required', statusCode: 400 });
        }

        const document = await Document.findOne({
            _id: documentId,
            userId: req.user._id,
            status: 'ready'
        });

        if (!document) {
            return res.status(404).json({ success: false, error: 'Document not found or not ready', statusCode: 404 });
        }

        const notes = await geminiService.generateStudyNotes(document.extractedText);

        res.status(200).json({
            success: true,
            data: notes,
            message: 'Study notes generated successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Generate Mind Map Tree
// @route   POST /api/ai/generate-mindmap
// @access  Private
export const generateMindMap = async (req, res, next) => {
    try {
        const { documentId } = req.body;
        if (!documentId) {
            return res.status(400).json({ success: false, error: 'Document ID is required', statusCode: 400 });
        }

        const document = await Document.findOne({
            _id: documentId,
            userId: req.user._id,
            status: 'ready'
        });

        if (!document) {
            return res.status(404).json({ success: false, error: 'Document not found or not ready', statusCode: 404 });
        }

        const mindMap = await geminiService.generateMindMap(document.extractedText);

        res.status(200).json({
            success: true,
            data: mindMap,
            message: 'Mind map generated successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Generate Personalized Quiz on Weak Topics
// @route   POST /api/ai/weak-topic-quiz
// @access  Private
export const generateWeakTopicQuiz = async (req, res, next) => {
    try {
        const requestedCount = req.body.numQuestions || req.body.questionCount || req.body.count || req.body.totalQuestions || 5;
        const targetCount = Math.max(1, Math.min(20, parseInt(requestedCount, 10) || 5));
        const { documentId } = req.body;
        let targetDocId = documentId;

        if (!targetDocId) {
            const firstDoc = await Document.findOne({ userId: req.user._id, status: 'ready' });
            targetDocId = firstDoc?._id;
        }

        if (!targetDocId) {
            return res.status(404).json({ success: false, error: 'No ready documents found for personalized quiz', statusCode: 404 });
        }

        const document = await Document.findOne({ _id: targetDocId, userId: req.user._id });
        if (!document) {
            return res.status(404).json({ success: false, error: 'Document not found', statusCode: 404 });
        }

        const contextSource = (document.chunks && document.chunks.length > 0) ? document.chunks : document.extractedText;
        const questions = await geminiService.generateQuiz(contextSource, targetCount);

        if (!questions || !Array.isArray(questions) || questions.length === 0) {
            return res.status(500).json({ success: false, error: 'Failed to generate weak topic quiz questions', statusCode: 500 });
        }

        const quiz = await Quiz.create({
            userId: req.user._id,
            documentId: document._id,
            title: `Diagnostic Weak Topic Quiz: ${document.title}`,
            questions: questions,
            totalQuestions: questions.length,
            userAnswer: [],
            score: 0,
        });

        console.log(`[Quiz Controller] Created weak topic quiz "${quiz.title}" with ${quiz.questions.length} questions for user ${req.user._id}`);

        res.status(200).json({
            success: true,
            data: quiz,
            message: 'Personalized weak-topic quiz generated successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Compare 2 Documents
// @route   POST /api/ai/compare-documents
// @access  Private
export const compareDocumentsHandler = async (req, res, next) => {
    try {
        const { docId1, docId2, query = '' } = req.body;
        if (!docId1 || !docId2) {
            return res.status(400).json({ success: false, error: 'Both docId1 and docId2 are required', statusCode: 400 });
        }

        const [doc1, doc2] = await Promise.all([
            Document.findOne({ _id: docId1, userId: req.user._id, status: 'ready' }),
            Document.findOne({ _id: docId2, userId: req.user._id, status: 'ready' })
        ]);

        if (!doc1 || !doc2) {
            return res.status(404).json({ success: false, error: 'One or both documents not found or not ready', statusCode: 404 });
        }

        const comparison = await geminiService.compareDocuments(
            doc1.title,
            doc1.extractedText,
            doc2.title,
            doc2.extractedText,
            query
        );

        res.status(200).json({
            success: true,
            data: {
                doc1: { id: doc1._id, title: doc1.title },
                doc2: { id: doc2._id, title: doc2.title },
                comparison
            },
            message: 'Documents compared successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Start AI Technical Interview Session
// @route   POST /api/ai/interview/start
// @access  Private
export const startInterview = async (req, res, next) => {
    try {
        const { documentId } = req.body;
        const doc = await Document.findOne({ _id: documentId, userId: req.user._id, status: 'ready' });
        if (!doc) {
            return res.status(404).json({ success: false, error: 'Document not found or not ready', statusCode: 404 });
        }

        const firstQuestion = `Explain the primary architecture and fundamental principle outlined in "${doc.title}". What problem does it solve and what are its main trade-offs?`;

        res.status(200).json({
            success: true,
            data: {
                documentTitle: doc.title,
                questionNumber: 1,
                totalQuestions: 4,
                question: firstQuestion,
                sessionId: `int_${Date.now()}`
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Submit Answer & Get Interview Feedback
// @route   POST /api/ai/interview/answer
// @access  Private
export const answerInterviewQuestion = async (req, res, next) => {
    try {
        const { documentId, question, userAnswer, questionNumber = 1, totalQuestions = 4 } = req.body;
        const doc = await Document.findOne({ _id: documentId, userId: req.user._id, status: 'ready' });

        const evaluation = await geminiService.evaluateInterviewAnswer(
            question,
            userAnswer,
            doc?.extractedText || ''
        );

        const isLastQuestion = questionNumber >= totalQuestions;
        let nextQuestion = null;

        if (!isLastQuestion) {
            const followUps = [
                `Based on "${doc?.title || 'the subject'}", how would you handle high scalability or unexpected edge cases in this system?`,
                `What are the critical limitations of this approach compared to modern alternatives?`,
                `If you were designing this in a production environment, what monitoring metrics and failure recovery patterns would you implement?`
            ];
            nextQuestion = followUps[(questionNumber - 1) % followUps.length];
        }

        let xpResult = null;
        if (isLastQuestion) {
            xpResult = await awardUserXP(req.user._id, 100, 'interview_completed');
        }

        res.status(200).json({
            success: true,
            data: {
                evaluation,
                isCompleted: isLastQuestion,
                nextQuestion,
                nextQuestionNumber: questionNumber + 1
            },
            xpResult,
            message: 'Interview answer evaluated successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Generate Presentation Slide Deck from Document
// @route   POST /api/ai/presentation/:documentId
// @access  Private
export const generatePresentationHandler = async (req, res, next) => {
    try {
        const { documentId } = req.params;
        const { slideCount = 6 } = req.body;

        const document = await Document.findOne({
            _id: documentId,
            userId: req.user._id
        });

        if (!document) {
            return res.status(404).json({ success: false, error: 'Document not found', statusCode: 404 });
        }

        if (document.status !== 'ready') {
            return res.status(400).json({ success: false, error: 'Document is still processing', statusCode: 400 });
        }

        const slides = await geminiService.generatePresentation(document.extractedText, parseInt(slideCount) || 6);

        res.status(200).json({
            success: true,
            data: slides,
            documentTitle: document.title,
            message: 'Presentation slides generated successfully'
        });
    } catch (error) {
        next(error);
    }
};

