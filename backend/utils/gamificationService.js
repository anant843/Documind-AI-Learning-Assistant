import User from '../models/User.js';

const BADGE_DEFINITIONS = {
    first_doc: {
        id: 'first_doc',
        name: 'First Step',
        icon: '🌱',
        description: 'Uploaded your first learning document'
    },
    quiz_whiz: {
        id: 'quiz_whiz',
        name: 'Quiz Whiz',
        icon: '⚡',
        description: 'Scored 80% or higher on a quiz'
    },
    streak_3: {
        id: 'streak_3',
        name: 'On Fire',
        icon: '🔥',
        description: 'Maintained a 3-day learning streak'
    },
    flashcard_master: {
        id: 'flashcard_master',
        name: 'Card Scholar',
        icon: '🧠',
        description: 'Reviewed 10+ flashcards'
    },
    interview_ready: {
        id: 'interview_ready',
        name: 'Job Ready',
        icon: '💼',
        description: 'Completed an AI Technical Mock Interview'
    },
    mastery_achieved: {
        id: 'mastery_achieved',
        name: 'Mastermind',
        icon: '🏆',
        description: 'Achieved Mastered status on flashcards'
    }
};

export const calculateLevel = (xp) => {
    if (xp < 100) return 1;
    if (xp < 250) return 2;
    if (xp < 500) return 3;
    if (xp < 1000) return 4;
    return Math.floor(xp / 250);
};

export const getNextLevelThreshold = (currentLevel) => {
    switch (currentLevel) {
        case 1: return 100;
        case 2: return 250;
        case 3: return 500;
        case 4: return 1000;
        default: return (currentLevel + 1) * 250;
    }
};

/**
 * Award XP and check for new badges
 */
export const awardUserXP = async (userId, xpAmount, actionType, extraData = {}) => {
    try {
        const user = await User.findById(userId);
        if (!user) return null;

        user.xp = (user.xp || 0) + xpAmount;
        user.level = calculateLevel(user.xp);

        // Track minutes or questions
        if (actionType === 'study_time' && extraData.minutes) {
            user.totalStudyMinutes = (user.totalStudyMinutes || 0) + extraData.minutes;
        }
        if (actionType === 'chat_question') {
            user.questionsAskedCount = (user.questionsAskedCount || 0) + 1;
        }

        const newBadges = [];
        const existingBadgeIds = new Set((user.badges || []).map(b => b.id));

        // Check badge triggers
        if (actionType === 'document_upload' && !existingBadgeIds.has('first_doc')) {
            newBadges.push(BADGE_DEFINITIONS.first_doc);
        }
        if (actionType === 'quiz_completed' && extraData.score >= 80 && !existingBadgeIds.has('quiz_whiz')) {
            newBadges.push(BADGE_DEFINITIONS.quiz_whiz);
        }
        if ((user.streak?.current || 0) >= 3 && !existingBadgeIds.has('streak_3')) {
            newBadges.push(BADGE_DEFINITIONS.streak_3);
        }
        if (actionType === 'flashcard_review' && extraData.totalReviewed >= 10 && !existingBadgeIds.has('flashcard_master')) {
            newBadges.push(BADGE_DEFINITIONS.flashcard_master);
        }
        if (actionType === 'interview_completed' && !existingBadgeIds.has('interview_ready')) {
            newBadges.push(BADGE_DEFINITIONS.interview_ready);
        }
        if (actionType === 'flashcard_mastered' && !existingBadgeIds.has('mastery_achieved')) {
            newBadges.push(BADGE_DEFINITIONS.mastery_achieved);
        }

        if (newBadges.length > 0) {
            user.badges = [...(user.badges || []), ...newBadges];
        }

        await user.save();

        return {
            xp: user.xp,
            level: user.level,
            earnedXP: xpAmount,
            newBadges,
            badges: user.badges
        };
    } catch (err) {
        console.error('Error awarding XP:', err);
        return null;
    }
};
