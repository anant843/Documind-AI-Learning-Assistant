import Document from '../models/Document.js';
import Flashcard from '../models/Flashcard.js';
import Quiz from '../models/Quiz.js';
import ChatHistory from '../models/ChatHistory.js';
import StudyHistory from '../models/StudyHistory.js';
import {extractTextFromPDF} from '../utils/pdfParser.js';
import {chunkText} from '../utils/textChunker.js';
import {generateEmbedding} from '../utils/embeddingService.js';
import { storePdf, openPdfStream, deletePdf } from '../utils/pdfStorage.js';

import fs from 'fs/promises';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { awardUserXP } from '../utils/gamificationService.js';

// Helper to compute SHA-256 hash of file for duplicate/re-upload detection
export const computeFileHash = async (filePath) => {
    try {
        const buffer = await fs.readFile(filePath);
        return crypto.createHash('sha256').update(buffer).digest('hex');
    } catch (e) {
        return '';
    }
};


// @desc    Upload pdf document
// @route   POST /api/documents/upload
// @access  Private
export const uploadDocument = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded', statusCode: 400 });
        }

        const { title } = req.body;
        if (!title) {
            // clean up uploaded file
            await fs.unlink(req.file.path).catch(() => {});
            return res.status(400).json({ success: false, error: 'Title is required', statusCode: 400 });
        }

        // Calculate file hash for re-upload and duplicate identification
        const fileHash = await computeFileHash(req.file.path);

        const documentId = new mongoose.Types.ObjectId();
        const fileId = await storePdf(req.file.path, req.file.originalname, {
            userId: req.user._id.toString(),
            documentId: documentId.toString()
        });

        // construct document data
        const baseUrl = process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`;
        const fileUrl = `${baseUrl}/api/documents/${documentId}/file`;

        // create document record 
        const document = await Document.create({
            _id: documentId,
            userId: req.user._id,
            title,
            filename: req.file.originalname,
            filepath: fileUrl,
            fileId,
            fileHash,
            filesize: req.file.size,
            status: 'processing'
        });

        // Check if this document was previously deleted and has preserved history in StudyHistory
        let restoredFlashcardsCount = 0;
        let restoredQuizzesCount = 0;

        try {
            const escapedTitle = title.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const matchingHistory = await StudyHistory.findOne({
                userId: req.user._id,
                $or: [
                    ...(fileHash ? [{ fileHash }] : []),
                    { documentTitle: { $regex: new RegExp(`^${escapedTitle}$`, 'i') } },
                    { filename: req.file.originalname }
                ]
            }).sort({ deletedAt: -1 });

            if (matchingHistory) {
                console.log(`[Re-upload Restoration] Found preserved history for "${matchingHistory.documentTitle}". Restoring quizzes and flashcards for document ID ${document._id}...`);

                // 1. Restore Flashcard Sets
                if (Array.isArray(matchingHistory.fullFlashcardSets) && matchingHistory.fullFlashcardSets.length > 0) {
                    for (const set of matchingHistory.fullFlashcardSets) {
                        if (set.cards && set.cards.length > 0) {
                            const cleanedCards = set.cards.map(c => ({
                                question: c.question,
                                answer: c.answer,
                                difficulty: c.difficulty || 'medium',
                                lastReviewed: c.lastReviewed || null,
                                reviewCount: c.reviewCount || 0,
                                isStarred: Boolean(c.isStarred),
                                nextReviewDate: c.nextReviewDate || null,
                                intervalDays: c.intervalDays || 0,
                                repetitionCount: c.repetitionCount || 0,
                                easeFactor: c.easeFactor || 2.5,
                                masteryStatus: c.masteryStatus || 'learning'
                            }));
                            await Flashcard.create({
                                userId: req.user._id,
                                documentId: document._id,
                                cards: cleanedCards
                            });
                            restoredFlashcardsCount += cleanedCards.length;
                        }
                    }
                } else if (Array.isArray(matchingHistory.flashcardSets) && matchingHistory.flashcardSets.length > 0) {
                    // Fallback for older history records
                    for (const set of matchingHistory.flashcardSets) {
                        if (set.cards && set.cards.length > 0) {
                            const cleanedCards = set.cards.map(c => ({
                                question: c.question,
                                answer: c.answer,
                                difficulty: c.difficulty || 'medium',
                                masteryStatus: c.masteryStatus || 'learning'
                            }));
                            await Flashcard.create({
                                userId: req.user._id,
                                documentId: document._id,
                                cards: cleanedCards
                            });
                            restoredFlashcardsCount += cleanedCards.length;
                        }
                    }
                }

                // 2. Restore Quizzes
                if (Array.isArray(matchingHistory.fullQuizzes) && matchingHistory.fullQuizzes.length > 0) {
                    for (const q of matchingHistory.fullQuizzes) {
                        if (q.questions && q.questions.length > 0) {
                            await Quiz.create({
                                userId: req.user._id,
                                documentId: document._id,
                                title: q.title || `Quiz for ${document.title}`,
                                questions: q.questions,
                                userAnswer: q.userAnswer || [],
                                score: q.score || 0,
                                totalQuestions: q.totalQuestions || q.questions.length,
                                completedAt: q.completedAt || null
                            });
                            restoredQuizzesCount += 1;
                        }
                    }
                }

                // 3. Reuse preserved text and chunks if available for immediate responsiveness
                if (matchingHistory.extractedText && Array.isArray(matchingHistory.chunks) && matchingHistory.chunks.length > 0) {
                    document.extractedText = matchingHistory.extractedText;
                    document.chunks = matchingHistory.chunks;
                    document.status = 'ready';
                    await document.save();
                    console.log(`[Re-upload Restoration] Instant vector index restored from cache (${document.chunks.length} chunks).`);
                }
            }
        } catch (restoreErr) {
            console.error("[Re-upload Restoration Error] Failed to restore history items:", restoreErr);
        }

        // If document not already restored to ready status, process PDF in background
        if (document.status !== 'ready') {
            if (process.env.VERCEL) {
                await processPDF(document._id, req.file.path);
            } else {
                processPDF(document._id, req.file.path).catch(err => {
                    console.error("Error processing PDF:", err);
                });
            }
        }

        await awardUserXP(req.user._id, 25, 'document_upload');

        const successMessage = (restoredFlashcardsCount > 0 || restoredQuizzesCount > 0)
            ? `Document re-uploaded successfully! Restored ${restoredFlashcardsCount} flashcard(s) and ${restoredQuizzesCount} quiz(zes).`
            : 'Document uploaded successfully and is being processed';

        res.status(201).json({
            success: true,
            data: document,
            restored: {
                flashcardsCount: restoredFlashcardsCount,
                quizzesCount: restoredQuizzesCount
            },
            message: successMessage,
        });

    } catch (error) {
        // clean up uploaded file in case of error
        if (req.file) {
            await fs.unlink(req.file.path).catch(() => {});
        }
        next(error);
    }
};



import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to resolve actual PDF file path on disk
export const getLocalPdfPath = (filepath) => {
    if (!filepath) return null;
    const filename = path.basename(filepath.replace(/\\/g, '/'));
    return path.join(__dirname, '../uploads/documents', filename);
};

// Helper function processing PDF with exact page-by-page mapping
export const processPDF = async (documentId, filePath) => {
    try {
        const { text, rawText, pages, numPages } = await extractTextFromPDF(filePath);

        // Chunk by real PDF pages to guarantee exact citation page numbers
        const rawChunks = chunkText(pages && pages.length > 0 ? pages : text, 450, 50);
        if (rawChunks.length === 0 || rawChunks.every(chunk => !chunk.content?.trim())) {
            throw new Error('No readable text was found in this PDF. It may be scanned or image-only and require OCR.');
        }
        const chunksWithEmbeddings = [];

        for (let idx = 0; idx < rawChunks.length; idx++) {
            const c = rawChunks[idx];
            const embedding = await generateEmbedding(c.content);
            chunksWithEmbeddings.push({
                ...c,
                chunkIndex: idx,
                pageNumber: c.pageNumber || 1,
                embedding
            });
        }

        // update document record
        const updatedDoc = await Document.findByIdAndUpdate(documentId, {
            extractedText: text || rawText,
            chunks: chunksWithEmbeddings,
            status: 'ready'
        }, { new: true });

        console.log(`Document ${documentId} processed with ${chunksWithEmbeddings.length} vector chunks across ${pages?.length || numPages} pages successfully.`);
        return updatedDoc;
    } catch (error) {
        console.error(`Error processing document ${documentId}:`, error);
        await Document.findByIdAndUpdate(documentId, {
            status: 'failed'
        });
        return null;
    }
};

// Self-healing helper: ensure document chunks have accurate, non-placeholder page numbers
export const ensureDocumentHasAccurateChunks = async (document) => {
    if (!document) return document;

    const chunks = document.chunks || [];
    // Check if chunks are missing or if all chunks have pageNumber === 0 or 1 while there might be multiple pages
    const needsReindex = chunks.length === 0 || chunks.some(c => !c.pageNumber || c.pageNumber === 0);

    if (needsReindex && document.filepath) {
        try {
            const localPath = getLocalPdfPath(document.filepath);
            const exists = await fs.stat(localPath).catch(() => null);
            if (exists) {
                console.log(`[Auto-Reindex] Refreshing exact page chunks for document "${document.title}" (${document._id})...`);
                const refreshed = await processPDF(document._id, localPath);
                if (refreshed) return refreshed;
            }
        } catch (e) {
            console.error(`[Auto-Reindex Error] Could not reindex document ${document._id}:`, e.message);
        }
    }
    return document;
};

// @desc    Get all documents for the user
// @route   GET /api/documents
// @access  Private
export const getDocuments = async (req, res, next) => {
    try {
        const documents=await Document.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(req.user._id) } },
            { $lookup: {
                from: 'flashcards',
                localField: '_id',
                foreignField: 'documentId',
                as: 'flashcardSets',
                }
            },
            { $lookup: {
                from: 'quizzes',
                localField: '_id',
                foreignField: 'documentId',
                as: 'quizzes',
                }
            },
            { $addFields: {
                flashcardCount: { $size: '$flashcardSets' },
                quizCount: { $size: '$quizzes' },
            }},
            { $project: { extractedText:0,chunks:0,flashcardSets:0,quizzes:0 } },
            { $sort: { uploadDate: -1 } }]);

        res.status(200).json({
            success: true,
            count: documents.length,
            data: documents,
        });


    }catch (error) {
        next(error);
    }
}

// @desc    Get single document by ID
// @route   GET /api/documents/:id
// @access  Private
export const getDocument = async (req, res, next) => {
       try {
        const document=await Document.findOne({
            _id:req.params.id,
            userId:req.user._id
        });
        if(!document){
            return  res.status(404).json({ success: false, error: 'Document not found', statusCode: 404 });
        }   

        // get count of ascsociated flashcards and quizzes
        const flashcardCount=await Flashcard.countDocuments({documentId:document._id,userId:req.user._id});
        const quizCount=await Quiz.countDocuments({documentId:document._id,userId:req.user._id});
        
        // update last accessed
        document.lastAccessed=Date.now();
        await document.save();

        // combine document data with counts
        const documentData=document.toObject();
        documentData.flashcardCount=flashcardCount;
        documentData.quizCount=quizCount;

        res.status(200).json({
            success: true,
            data: documentData,
        });

    }catch (error) {
        next(error);
    }
}

export const getDocumentFile = async (req, res, next) => {
    try {
        const document = await Document.findOne({
            _id: req.params.id,
            userId: req.user._id
        }).select('filename fileId');
        if (!document?.fileId) {
            return res.status(404).json({ success: false, error: 'PDF file is unavailable. Please upload the document again.', statusCode: 404 });
        }
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${document.filename.replace(/["\\]/g, '_')}"`,
            'Cache-Control': 'private, max-age=3600'
        });
        const stream = openPdfStream(document.fileId);
        stream.on('error', next);
        stream.pipe(res);
    } catch (error) {
        next(error);
    }
};



// @desc    Delete document by ID
// @route   DELETE /api/documents/:id
// @access  Private
export const deleteDocument = async (req, res, next) => {
    try {
        const document = await Document.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!document) {
            return res.status(404).json({ success: false, error: 'Document not found', statusCode: 404 });
        }

        // 1. Gather flashcard sets for archiving
        const flashcardSets = await Flashcard.find({ documentId: document._id });
        let totalFlashcards = 0;
        let masteredFlashcards = 0;
        let reviewedFlashcards = 0;
        const archivedSets = flashcardSets.map(set => {
            const cards = set.cards || [];
            const count = cards.length;
            const mastered = cards.filter(c => c.masteryStatus === 'mastered').length;
            const reviewed = cards.filter(c => c.reviewCount > 0).length;
            totalFlashcards += count;
            masteredFlashcards += mastered;
            reviewedFlashcards += reviewed;
            return {
                title: document.title,
                cardsCount: count,
                masteredCount: mastered,
                cards: cards.map(c => ({
                    question: c.question,
                    answer: c.answer,
                    difficulty: c.difficulty || 'medium',
                    masteryStatus: c.masteryStatus || 'learning'
                }))
            };
        });
        const fullFlashcardSets = flashcardSets.map(s => (s.toObject ? s.toObject() : s));
        const flashcardsMastery = totalFlashcards > 0 ? Math.round((masteredFlashcards / totalFlashcards) * 100) : 0;

        // 2. Gather quizzes for archiving
        const quizzes = await Quiz.find({ documentId: document._id });
        const completedQuizzes = quizzes.filter(q => q.completedAt !== null);
        const quizzesCount = quizzes.length;
        const completedQuizzesCount = completedQuizzes.length;
        const scores = completedQuizzes.map(q => q.score || 0);
        const averageQuizScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        const highestQuizScore = scores.length > 0 ? Math.max(...scores) : 0;

        const archivedQuizzes = quizzes.map(q => ({
            quizId: q._id.toString(),
            title: q.title || `Quiz for ${document.title}`,
            score: q.score || 0,
            totalQuestions: q.totalQuestions || (q.questions ? q.questions.length : 0),
            completedAt: q.completedAt,
            userAnswersCount: (q.userAnswer || []).length
        }));
        const fullQuizzes = quizzes.map(q => (q.toObject ? q.toObject() : q));

        // 3. Compute or resolve fileHash
        let fileHash = document.fileHash;
        if (!fileHash && document.filepath) {
            const localPath = getLocalPdfPath(document.filepath);
            if (localPath) {
                fileHash = await computeFileHash(localPath);
            }
        }

        // 4. Save into StudyHistory archive
        await StudyHistory.create({
            userId: req.user._id,
            originalDocumentId: document._id,
            documentTitle: document.title,
            filename: document.filename || '',
            fileHash: fileHash || '',
            extractedText: document.extractedText || '',
            chunks: document.chunks || [],
            fullFlashcardSets,
            fullQuizzes,
            deletedAt: new Date(),
            totalFlashcards,
            masteredFlashcards,
            reviewedFlashcards,
            flashcardsMastery,
            flashcardSets: archivedSets,
            quizzesCount,
            completedQuizzesCount,
            averageQuizScore,
            highestQuizScore,
            quizzes: archivedQuizzes
        });

        // 5. Delete durable and legacy PDF files
        await deletePdf(document.fileId).catch(() => {});
        if (document.filepath) {
            const localPath = getLocalPdfPath(document.filepath);
            if (localPath) {
                await fs.unlink(localPath).catch(() => {});
            }
            await fs.unlink(document.filepath).catch(() => {});
        }

        // 5. Cascade delete: remove all flashcard sets associated with this document
        await Flashcard.deleteMany({
            documentId: document._id
        });

        // 6. Cascade delete: remove all quizzes associated with this document
        await Quiz.deleteMany({
            documentId: document._id
        });

        // 7. Cascade delete: remove single document chat history for this document
        await ChatHistory.deleteMany({
            documentId: document._id
        });

        // 8. Cascade delete: remove / clear multi-doc chat history for the user
        await ChatHistory.deleteMany({
            userId: req.user._id,
            sessionType: 'multi'
        });

        // 9. Delete document record itself
        await document.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Document deleted and preserved in History successfully',
        });

    } catch (error) {
        next(error);
    }
}
