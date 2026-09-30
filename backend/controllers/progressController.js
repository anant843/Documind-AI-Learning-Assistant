import Document from "../models/Document.js";
import Flashcard from "../models/Flashcard.js";
import Quiz from "../models/Quiz.js";
import StudyPlan from "../models/StudyPlan.js";
import User from "../models/User.js";
import StudyHistory from "../models/StudyHistory.js";
import { getNextLevelThreshold } from "../utils/gamificationService.js";

// @desc    Get user learning statistics shown on dashboard with Weak Topic Detection & Analytics
// @route   GET /api/progress/dashboard
// @access  Private
export const getDashboard = async (req, res, next) => {
    try {
        const userId = req.user._id;

        // Update real user activity streak
        const user = await User.findById(userId);
        if (user && typeof user.updateActivityStreak === 'function') {
            user.updateActivityStreak();
            await user.save();
        }

        const streakCurrent = user?.streak?.current || 1;
        const streakMax = user?.streak?.max || 1;

        // Fetch currently active/available documents for this user
        const activeDocs = await Document.find({ userId });
        const activeDocIds = activeDocs.map(d => d._id);
        const totalDocuments = activeDocIds.length;

        // If no PDFs are available, return absolute ZERO for all dashboard statistics
        if (totalDocuments === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    overview: {
                        totalDocuments: 0,
                        totalFlashcardSets: 0,
                        totalFlashcards: 0,
                        totalFlashcardsReviewed: 0,
                        totalFlashcardsMastered: 0,
                        masteryPercentage: 0,
                        staredFlashcards: 0,
                        totalQuizzes: 0,
                        completedQuizzes: 0,
                        averageScore: 0,
                        studyStreak: 0,
                        maxStreak: 0,
                        xp: user?.xp || 0,
                        level: user?.level || 1,
                        nextLevelThreshold: getNextLevelThreshold(user?.level || 1),
                        badges: user?.badges || [],
                        totalStudyMinutes: 0,
                        questionsAskedCount: 0,
                    },
                    weakTopics: [],
                    topicAccuracy: [],
                    quizPerformanceTrend: [],
                    recentActivities: {
                        documents: [],
                        quizzes: []
                    }
                }
            });
        }

        // Active Document and Flashcard Counts
        const totalFlashcardSets = await Flashcard.countDocuments({ userId, documentId: { $in: activeDocIds } });
        const totalQuizzes = await Quiz.countDocuments({ userId, documentId: { $in: activeDocIds } });
        const completedQuizzes = await Quiz.countDocuments({ userId, documentId: { $in: activeDocIds }, completedAt: { $ne: null } });

        // Flashcard Statistics for Available Documents
        const flashcardSets = await Flashcard.find({ userId, documentId: { $in: activeDocIds } });
        let totalFlashcardsReviewed = 0;
        let totalFlashcards = 0;
        let staredFlashcards = 0;
        let totalFlashcardsMastered = 0;

        flashcardSets.forEach(set => {
            totalFlashcards += set.cards.length;
            totalFlashcardsReviewed += set.cards.filter(card => card.reviewCount > 0).length;
            totalFlashcardsMastered += set.cards.filter(card => card.masteryStatus === 'mastered').length;
            staredFlashcards += set.cards.filter(card => card.isStarred || card.isStarted).length;
        });
        const overallMastery = totalFlashcards > 0 ? Math.round((totalFlashcardsMastered / totalFlashcards) * 100) : 0;

        // Completed Quizzes for Available Documents
        const quizzes = await Quiz.find({ userId, documentId: { $in: activeDocIds }, completedAt: { $ne: null } })
            .sort({ completedAt: 1 })
            .populate('documentId', 'title');

        const averageScore = quizzes.length > 0
            ? Math.round(quizzes.reduce((sum, quiz) => sum + quiz.score, 0) / quizzes.length)
            : 0;

        // Weak Topic Detection & Topic Accuracy Calculation
        const topicMap = {};
        quizzes.forEach(q => {
            const docId = q.documentId?._id?.toString() || 'unknown';
            const title = q.documentId?.title || q.title.replace(/^Quiz for\s+/i, '') || 'General Subject';
            if (!topicMap[docId]) {
                topicMap[docId] = {
                    documentId: docId,
                    topic: title,
                    scores: [],
                    quizzesCount: 0
                };
            }
            topicMap[docId].scores.push(q.score);
            topicMap[docId].quizzesCount += 1;
        });

        const topicAccuracy = Object.values(topicMap).map(t => {
            const avg = Math.round(t.scores.reduce((a, b) => a + b, 0) / t.scores.length);
            let status = 'strong';
            if (avg < 60) status = 'needs_revision';
            else if (avg < 80) status = 'moderate';

            return {
                documentId: t.documentId,
                topic: t.topic,
                avgScore: avg,
                quizzesCount: t.quizzesCount,
                status
            };
        });

        // Detected Weak Topics requiring alert/recommendation
        const weakTopics = topicAccuracy
            .filter(t => t.status === 'needs_revision' || t.status === 'moderate')
            .map(t => ({
                topic: t.topic,
                documentId: t.documentId,
                avgScore: t.avgScore,
                priority: t.avgScore < 50 ? 'Critical' : 'Moderate',
                recommendation: `${t.topic} average score is ${t.avgScore}%. Focus on chapter review notes and take a targeted practice quiz.`
            }));

        // Quiz Performance Trend (last 8 quizzes)
        const quizPerformanceTrend = quizzes.slice(-8).map(q => ({
            id: q._id,
            title: q.title.length > 22 ? q.title.substring(0, 20) + '...' : q.title,
            score: q.score,
            date: q.completedAt ? new Date(q.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recent'
        }));

        // Recent user activities for available documents
        const recentDocuments = await Document.find({ userId })
            .sort({ lastAccessed: -1 })
            .limit(5)
            .select('title filename lastAccessed status');

        const recentQuizzes = await Quiz.find({ userId, documentId: { $in: activeDocIds } })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('documentId', 'title')
            .select('title score totalQuestions completedAt');

        res.status(200).json({
            success: true,
            data: {
                overview: {
                    totalDocuments,
                    totalFlashcardSets,
                    totalFlashcards,
                    totalFlashcardsReviewed,
                    totalFlashcardsMastered,
                    masteryPercentage: overallMastery,
                    staredFlashcards,
                    totalQuizzes,
                    completedQuizzes,
                    averageScore,
                    studyStreak: streakCurrent,
                    maxStreak: streakMax,
                    xp: user?.xp || 0,
                    level: user?.level || 1,
                    nextLevelThreshold: getNextLevelThreshold(user?.level || 1),
                    badges: user?.badges || [],
                    totalStudyMinutes: user?.totalStudyMinutes || 0,
                    questionsAskedCount: user?.questionsAskedCount || 0,
                },
                weakTopics,
                topicAccuracy,
                quizPerformanceTrend,
                recentActivities: {
                    documents: recentDocuments,
                    quizzes: recentQuizzes
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get active AI Study Plan
// @route   GET /api/progress/study-plan
// @access  Private
export const getStudyPlan = async (req, res, next) => {
    try {
        const userId = req.user._id;
        let plan = await StudyPlan.findOne({ userId, isActive: true }).sort({ createdAt: -1 });

        if (!plan) {
            // Auto-generate initial adaptive plan if none exists
            plan = await createAdaptiveStudyPlan(userId);
        }

        res.status(200).json({
            success: true,
            data: plan
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Generate new AI Study Plan
// @route   POST /api/progress/study-plan/generate
// @access  Private
export const generateStudyPlan = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const requestedMode = req.body?.mode || req.query?.mode;
        const newPlan = await createAdaptiveStudyPlan(userId, requestedMode);

        res.status(200).json({
            success: true,
            data: newPlan,
            message: 'Adaptive AI Study Plan generated successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Toggle completion of a task in study plan
// @route   PATCH /api/progress/study-plan/task/:taskId
// @access  Private
export const toggleStudyPlanTask = async (req, res, next) => {
    try {
        const { taskId } = req.params;
        const userId = req.user._id;

        const plan = await StudyPlan.findOne({ userId, isActive: true });
        if (!plan) {
            return res.status(404).json({ success: false, error: 'Study plan not found', statusCode: 404 });
        }

        const task = plan.days.find(d => d._id.toString() === taskId);
        if (!task) {
            return res.status(404).json({ success: false, error: 'Task not found in study plan', statusCode: 404 });
        }

        task.isCompleted = !task.isCompleted;
        await plan.save();

        res.status(200).json({
            success: true,
            data: plan,
            message: `Task "${task.topic}" marked as ${task.isCompleted ? 'completed' : 'pending'}`
        });
    } catch (error) {
        next(error);
    }
};

// Helper: Clean up document and raw filenames into human-readable titles
function formatCleanTitle(rawTitle, originalName) {
    let title = rawTitle || originalName || 'Core Fundamentals';
    
    // Remove leading timestamps and UUID-like digits (e.g. 1790687973797-761001734-)
    title = title.replace(/^\d+-\d+-/i, '');
    title = title.replace(/^[0-9a-f]{24}-/i, '');
    
    // Remove file extensions
    title = title.replace(/\.(pdf|docx|txt|doc|pptx)$/i, '');
    
    // Replace generic WhatsApp/Camera exports like DOC-20260329-WA0001
    title = title.replace(/^DOC-\d+-WA\d+/i, 'Subject Study Guide');
    
    // Replace hyphens and underscores with spaces
    title = title.replace(/[-_]+/g, ' ').trim();
    
    // Capitalize words
    title = title
        .split(' ')
        .filter(w => w.length > 0)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
        
    return title.length > 0 ? title : 'Core Subject Mastery';
}

// Helper: Generate intelligent, adaptive 7-day study plan based on user's weak topics & schedule mode
async function createAdaptiveStudyPlan(userId, requestedMode = null) {
    // 1. Deactivate previous plans for this user
    await StudyPlan.updateMany({ userId }, { isActive: false });

    // 2. Fetch all user documents
    const documents = await Document.find({ userId, status: 'ready' }).sort({ updatedAt: -1 });

    // 3. Fetch completed quizzes to compute topic analytics & weak areas
    const completedQuizzes = await Quiz.find({ userId, completedAt: { $ne: null } })
        .populate('documentId', 'title originalName');

    const topicStats = {};
    completedQuizzes.forEach(q => {
        const docId = q.documentId?._id?.toString() || 'general';
        const docTitle = formatCleanTitle(q.documentId?.title || q.documentId?.originalName || q.title?.replace(/^Quiz for\s+/i, ''));
        
        if (!topicStats[docId]) {
            topicStats[docId] = {
                documentId: q.documentId?._id || null,
                documentTitle: docTitle,
                scores: [],
                count: 0
            };
        }
        topicStats[docId].scores.push(q.score);
        topicStats[docId].count += 1;
    });

    const topicPerformance = Object.values(topicStats).map(t => {
        const avg = Math.round(t.scores.reduce((a, b) => a + b, 0) / t.scores.length);
        let status = 'strong';
        if (avg < 60) status = 'needs_revision';
        else if (avg < 80) status = 'moderate';
        return {
            documentId: t.documentId,
            documentTitle: t.documentTitle,
            avgScore: avg,
            status
        };
    });

    // Categorize topics
    const weakTopics = topicPerformance.filter(t => t.status === 'needs_revision' || t.status === 'moderate');
    const strongTopics = topicPerformance.filter(t => t.status === 'strong');

    // Identify unassessed uploaded documents
    const assessedDocIds = new Set(topicPerformance.map(t => t.documentId?.toString()).filter(Boolean));
    const unassessedDocs = documents
        .filter(d => !assessedDocIds.has(d._id.toString()))
        .map(d => ({
            documentId: d._id,
            documentTitle: formatCleanTitle(d.title, d.originalName),
            avgScore: null,
            status: 'unassessed'
        }));

    // Prioritized list: Weak Topics FIRST -> Moderate -> Unassessed -> Strong
    const prioritizedTopics = [
        ...weakTopics.sort((a, b) => a.avgScore - b.avgScore),
        ...unassessedDocs,
        ...strongTopics.sort((a, b) => a.avgScore - b.avgScore)
    ];

    // Fallback if user has no documents yet
    if (prioritizedTopics.length === 0) {
        prioritizedTopics.push({
            documentId: null,
            documentTitle: 'Core Subject Concepts & Foundations',
            avgScore: 75,
            status: 'general'
        });
    }

    // 4. Determine Schedule Mode
    let scheduleMode = requestedMode;
    const validModes = ['Weak topic recovery', 'Exam preparation', 'Revision mode', 'New document learning'];
    if (!scheduleMode || !validModes.includes(scheduleMode)) {
        if (weakTopics.length > 0) {
            scheduleMode = 'Weak topic recovery';
        } else if (unassessedDocs.length > 0) {
            scheduleMode = 'New document learning';
        } else if (strongTopics.length > 0) {
            scheduleMode = 'Revision mode';
        } else {
            scheduleMode = 'Exam preparation';
        }
    }

    // Helper to get round-robin topic from prioritized list
    const getTopicForDay = (index) => {
        return prioritizedTopics[index % prioritizedTopics.length];
    };

    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    // 5. Build 7-Day Pedagogical Learning Flow
    // Day 1 -> Learn (Category: Notes)
    // Day 2 -> Revise (Category: Revision)
    // Day 3 -> Practice (Category: Quiz)
    // Day 4 -> Reinforce (Category: Practice)
    // Day 5 -> Advanced Practice (Category: Flashcards)
    // Day 6 -> Mock Assessment (Category: Assessment)
    // Day 7 -> Review & Consolidation (Category: Revision)

    const stageTemplates = [
        {
            stage: 'Learn',
            category: 'Notes',
            actionType: 'Notes',
            estimatedMinutes: 50,
            buildTitle: (topic) => `Master Core Principles & Notes: ${topic}`,
            buildObjective: (topic, mode) => `Analyze foundational concepts, synthesize chapter summaries, and outline key formulas for ${topic}.`,
            focusAreas: ['Core Definitions & Axioms', 'Key Concepts Summary', 'Introductory Examples']
        },
        {
            stage: 'Revise',
            category: 'Revision',
            actionType: 'Revision',
            estimatedMinutes: 35,
            buildTitle: (topic) => `Active Recall & Concept Review: ${topic}`,
            buildObjective: (topic, mode) => `Reinforce conceptual memory through active recall drills and high-yield terminology for ${topic}.`,
            focusAreas: ['High-Yield Terminology', 'Formula Retention', 'Concept Mapping']
        },
        {
            stage: 'Practice',
            category: 'Quiz',
            actionType: 'Quiz',
            estimatedMinutes: 30,
            buildTitle: (topic) => `Targeted Diagnostic Quiz: ${topic}`,
            buildObjective: (topic, mode) => `Complete targeted quiz questions to test comprehension and identify remaining knowledge gaps in ${topic}.`,
            focusAreas: ['Timed Practice Questions', 'Gap Identification', 'Accuracy Check']
        },
        {
            stage: 'Reinforce',
            category: 'Practice',
            actionType: 'Practice',
            estimatedMinutes: 45,
            buildTitle: (topic) => `Deep Dive & Weak Spot Remediation: ${topic}`,
            buildObjective: (topic, mode) => `Tackle complex edge cases and remediate previously missed questions in ${topic}.`,
            focusAreas: ['Complex Problem Solving', 'Error Correction', 'Edge-Case Explanations']
        },
        {
            stage: 'Advanced Practice',
            category: 'Flashcards',
            actionType: 'Flashcards',
            estimatedMinutes: 40,
            buildTitle: (topic) => `Spaced Repetition & Flashcard Drill: ${topic}`,
            buildObjective: (topic, mode) => `Master rapid recall with Leitner spaced repetition flashcards covering advanced scenarios in ${topic}.`,
            focusAreas: ['Speed Recall', 'Cross-Topic Connections', 'Mastery Verification']
        },
        {
            stage: 'Mock Assessment',
            category: 'Assessment',
            actionType: 'Assessment',
            estimatedMinutes: 45,
            buildTitle: (topic) => `Comprehensive Mock Exam & Assessment: ${topic}`,
            buildObjective: (topic, mode) => `Simulate real exam conditions with a full-length timed evaluation covering all weekly topics.`,
            focusAreas: ['Exam Simulation', 'Time Management', 'Full Syllabus Evaluation']
        },
        {
            stage: 'Review & Consolidation',
            category: 'Revision',
            actionType: 'Revision',
            estimatedMinutes: 30,
            buildTitle: (topic) => `Weekly Mastery Consolidation & Error Analysis`,
            buildObjective: (topic, mode) => `Consolidate study notes, review weekly quiz performance metrics, and finalize mastery checklist.`,
            focusAreas: ['Weekly Error Journal', 'Mastery Checklist', 'Long-Term Retention Review']
        }
    ];

    // Track used titles to ensure 100% uniqueness
    const usedTitles = new Set();
    const days = [];

    for (let i = 0; i < 7; i++) {
        const stageConfig = stageTemplates[i];
        
        // Prioritize weak topics on days 1-4, and comprehensive topics on days 5-7
        const dayTopicObj = getTopicForDay(i);
        const cleanDocTitle = dayTopicObj.documentTitle;
        
        let taskTitle = stageConfig.buildTitle(cleanDocTitle);
        
        // Ensure task title uniqueness
        let duplicateCounter = 1;
        while (usedTitles.has(taskTitle)) {
            taskTitle = `${stageConfig.buildTitle(cleanDocTitle)} (Part ${++duplicateCounter})`;
        }
        usedTitles.add(taskTitle);

        const objective = stageConfig.buildObjective(cleanDocTitle, scheduleMode);

        days.push({
            dayName: dayNames[i],
            topic: taskTitle,
            objective,
            learningFlowStage: stageConfig.stage,
            documentTitle: cleanDocTitle,
            documentId: dayTopicObj.documentId || null,
            focusAreas: stageConfig.focusAreas,
            estimatedMinutes: stageConfig.estimatedMinutes,
            actionType: stageConfig.actionType,
            category: stageConfig.category,
            isCompleted: false
        });
    }

    // Create and return the fresh study plan
    const planTitle = scheduleMode === 'Weak topic recovery'
        ? '7-Day Weak Topic Recovery & Mastery Roadmap'
        : scheduleMode === 'Exam preparation'
        ? '7-Day Intensive Exam Preparation Schedule'
        : scheduleMode === 'New document learning'
        ? '7-Day New Document Discovery & Learning Flow'
        : '7-Day Adaptive Concept Revision Roadmap';

    const addressedWeakTopicNames = weakTopics.map(w => w.documentTitle);

    return await StudyPlan.create({
        userId,
        title: planTitle,
        scheduleMode,
        days,
        weakTopicsAddressed: addressedWeakTopicNames.length > 0 ? addressedWeakTopicNames : [prioritizedTopics[0].documentTitle],
        isActive: true
    });
}

// @desc    Get Archived History of deleted PDFs (quiz scores, flashcards, averages)
// @route   GET /api/progress/history
// @access  Private
export const getHistory = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const histories = await StudyHistory.find({ userId }).sort({ deletedAt: -1 });

        // Calculate cumulative historical metrics
        let totalDeletedDocs = histories.length;
        let totalHistoricalQuizzes = 0;
        let totalHistoricalFlashcards = 0;
        let totalHistoricalMastered = 0;
        let scoreSum = 0;
        let scoredQuizzesCount = 0;

        histories.forEach(h => {
            totalHistoricalQuizzes += (h.completedQuizzesCount || h.quizzesCount || 0);
            totalHistoricalFlashcards += (h.totalFlashcards || 0);
            totalHistoricalMastered += (h.masteredFlashcards || 0);
            if (h.averageQuizScore > 0 && h.completedQuizzesCount > 0) {
                scoreSum += h.averageQuizScore * h.completedQuizzesCount;
                scoredQuizzesCount += h.completedQuizzesCount;
            }
        });

        const overallHistoricalAvgScore = scoredQuizzesCount > 0 ? Math.round(scoreSum / scoredQuizzesCount) : 0;

        res.status(200).json({
            success: true,
            data: {
                summary: {
                    totalDeletedDocs,
                    totalHistoricalQuizzes,
                    totalHistoricalFlashcards,
                    totalHistoricalMastered,
                    overallHistoricalAvgScore
                },
                items: histories
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete single archived history item or all
// @route   DELETE /api/progress/history/:id
// @access  Private
export const deleteHistoryItem = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        if (id && id !== 'all') {
            await StudyHistory.deleteOne({ _id: id, userId });
        } else {
            await StudyHistory.deleteMany({ userId });
        }

        res.status(200).json({
            success: true,
            message: 'Archived history deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};