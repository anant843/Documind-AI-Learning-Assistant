import Quiz from "../models/Quiz.js";
import { awardUserXP } from "../utils/gamificationService.js";

// @desc    Get all quizzes for a document
// @route   GET /api/quizzes/:documentId
// @access  Private
export const getQuizzes = async (req, res, next) => {
    try {
        const quizzes = await Quiz.find({
            userId: req.user._id,
            documentId: req.params.documentId
        }).populate('documentId', 'title filename').sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: quizzes.length,
            data: quizzes
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single quiz by ID
// @route   GET /api/quizzes/quiz/:id
// @access  Private
export const getQuizById = async (req, res, next) => {
    try {
        const quiz = await Quiz.findOne({
            _id: req.params.id,
            userId: req.user._id
        }).populate('documentId', 'title filename');

        if (!quiz) {
            return res.status(404).json({ success: false, error: 'Quiz not found', statusCode: 404 });
        }

        res.status(200).json({
            success: true,
            data: quiz
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Submit quiz answers
// @route   POST /api/quizzes/:id/submit
// @access  Private
export const submitQuiz = async (req, res, next) => {
    try {
        const { answers } = req.body;

        if (!Array.isArray(answers)) {
            return res.status(400).json({ success: false, error: 'Answers must be an array', statusCode: 400 });
        }

        const quiz = await Quiz.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!quiz) {
            return res.status(404).json({ success: false, error: 'Quiz not found', statusCode: 404 });
        }

        console.log(`[Quiz Evaluation] Evaluating submission for quiz ID ${quiz._id} (${quiz.questions.length} questions)...`);

        let correctCount = 0;
        const userAnswers = [];

        quiz.questions.forEach((question, index) => {
            const submitted = answers.find((ans) => ans.questionIndex === index);
            
            let selectedOptionId = "";
            let selectedOptionText = "";

            if (submitted) {
                const rawOption = (submitted.selectedOption || "").toString().trim().toUpperCase();
                const rawAnswer = (submitted.selectedAnswer || "").toString().trim();

                // If explicit valid option ID provided ('A', 'B', 'C', 'D')
                if (['A', 'B', 'C', 'D'].includes(rawOption)) {
                    selectedOptionId = rawOption;
                    const matchedOpt = question.options?.find(o => o.id === selectedOptionId);
                    selectedOptionText = matchedOpt ? matchedOpt.text : rawAnswer;
                } else if (['A', 'B', 'C', 'D'].includes(rawAnswer.toUpperCase())) {
                    selectedOptionId = rawAnswer.toUpperCase();
                    const matchedOpt = question.options?.find(o => o.id === selectedOptionId);
                    selectedOptionText = matchedOpt ? matchedOpt.text : "";
                } else if (rawAnswer) {
                    // Match by option text
                    const matchedOpt = question.options?.find(o => 
                        o.text && o.text.trim().toLowerCase() === rawAnswer.toLowerCase()
                    );
                    if (matchedOpt) {
                        selectedOptionId = matchedOpt.id;
                        selectedOptionText = matchedOpt.text;
                    } else {
                        selectedOptionText = rawAnswer;
                    }
                }
            }

            const expectedCorrectOption = (question.correctOption || "").toString().trim().toUpperCase();

            // Compare user selected option with expected correct option
            const isCorrect = Boolean(selectedOptionId && selectedOptionId === expectedCorrectOption);
            if (isCorrect) {
                correctCount++;
            }

            userAnswers.push({
                questionIndex: index,
                selectedOption: selectedOptionId,
                selectedAnswer: selectedOptionText || (selectedOptionId ? `Option ${selectedOptionId}` : "No answer selected"),
                isCorrect,
                answeredAt: new Date()
            });
        });

        const totalQuestions = quiz.questions.length || quiz.totalQuestions || 1;
        const score = Math.round((correctCount / totalQuestions) * 100);

        quiz.userAnswer = userAnswers;
        quiz.score = score;
        quiz.completedAt = new Date();
        await quiz.save();

        console.log(`[Quiz Evaluation] Completed with score: ${score}% (${correctCount}/${totalQuestions} correct)`);

        let xpResult = null;
        try {
            xpResult = await awardUserXP(req.user._id, 50, 'quiz_completed', { score });
        } catch (xpErr) {
            console.warn('[Quiz XP] Could not award XP:', xpErr.message);
        }

        res.status(200).json({
            success: true,
            data: { 
                quizId: quiz._id, 
                score, 
                correctCount, 
                totalQuestions, 
                percentage: score, 
                userAnswers 
            },
            xpResult,
            message: 'Quiz submitted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get quiz results
// @route   GET /api/quizzes/:id/results
// @access  Private
export const getQuizResults = async (req, res, next) => {
    try {
        const quiz = await Quiz.findOne({
            _id: req.params.id,
            userId: req.user._id
        }).populate('documentId', 'title filename');

        if (!quiz) {
            return res.status(404).json({ success: false, error: 'Quiz not found', statusCode: 404 });
        }

        if (!quiz.completedAt) {
            return res.status(400).json({ success: false, error: 'Quiz not yet submitted', statusCode: 400 });
        }

        // Build detailed question-by-question results
        const detailedResults = quiz.questions.map((question, index) => {
            const userAnswer = quiz.userAnswer.find((ans) => ans.questionIndex === index);
            const userOptId = (userAnswer?.selectedOption || '').toUpperCase();
            const correctOptId = (question.correctOption || '').toUpperCase();

            const correctOptionObj = question.options?.find(o => o.id === correctOptId);
            const userOptionObj = question.options?.find(o => o.id === userOptId);

            const correctDisplayText = correctOptionObj 
                ? `${correctOptId}: ${correctOptionObj.text}`
                : (question.correctAnswer || `Option ${correctOptId}`);

            const userDisplayText = userOptionObj
                ? `${userOptId}: ${userOptionObj.text}`
                : (userAnswer?.selectedAnswer || (userOptId ? `Option ${userOptId}` : "No answer selected"));

            return {
                questionIndex: index,
                question: question.question,
                options: question.options,
                correctOption: correctOptId,
                correctAnswer: correctDisplayText,
                selectedOption: userOptId,
                selectedAnswer: userDisplayText,
                userAnswer: userDisplayText,
                isCorrect: Boolean(userAnswer?.isCorrect),
                explanation: question.explanation || '',
                difficulty: question.difficulty || 'medium',
            };
        });

        res.status(200).json({
            success: true,
            data: {
                quiz: {
                    id: quiz._id,
                    title: quiz.title,
                    document: quiz.documentId,
                    score: quiz.score,
                    totalQuestions: quiz.totalQuestions || quiz.questions.length,
                    completedAt: quiz.completedAt,
                },
                results: detailedResults
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Reset / Retake quiz
// @route   POST /api/quizzes/:id/reset
// @access  Private
export const resetQuiz = async (req, res, next) => {
    try {
        const quiz = await Quiz.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!quiz) {
            return res.status(404).json({ success: false, error: 'Quiz not found', statusCode: 404 });
        }

        quiz.userAnswer = [];
        quiz.score = 0;
        quiz.completedAt = null;
        await quiz.save();

        res.status(200).json({
            success: true,
            data: quiz,
            message: 'Quiz reset successfully for re-attempt'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete quiz by ID
// @route   DELETE /api/quizzes/:id
// @access  Private
export const deleteQuiz = async (req, res, next) => {
    try {
        const quiz = await Quiz.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!quiz) {
            return res.status(404).json({ success: false, error: 'Quiz not found', statusCode: 404 });
        }

        await quiz.deleteOne();
        res.status(200).json({
            success: true,
            message: 'Quiz deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
