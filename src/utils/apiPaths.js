// Keep production browser requests on the frontend origin. Vercel proxies /api
// to the backend, which avoids browser CORS, DNS, and extension blocking issues.
export const BASE_URL = import.meta.env.PROD
    ? ""
    : (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000");

export const API_PATHS = {
    AUTH: {
        REGISTER: "/api/auth/register",
        LOGIN: "/api/auth/login",
        GET_PROFILE: "/api/auth/profile",
        UPDATE_PROFILE: "/api/auth/profile",
        CHANGE_PASSWORD: "/api/auth/change-password",
    },
    DOCUMENTS: {
        UPLOAD: "/api/documents/upload",
        GET_DOCUMENTS: "/api/documents/",
        GET_DOCUMENT_BY_ID: (id) => `/api/documents/${id}`,
        GET_DOCUMENT_FILE: (id) => `/api/documents/${id}/file`,
        UPDATE_DOCUMENT: (id) => `/api/documents/${id}`,
        DELETE_DOCUMENT: (id) => `/api/documents/${id}`,
    },

    AI: {
        GENERATE_FLASHCARDS: "/api/ai/generate-flashcards",
        GENERATE_QUIZ: "/api/ai/generate-quiz",
        GENERATE_SUMMARY: "/api/ai/generate-summary",
        GENERATE_NOTES: "/api/ai/generate-notes",
        GENERATE_MINDMAP: "/api/ai/generate-mindmap",
        GENERATE_PRESENTATION: (documentId) => `/api/ai/presentation/${documentId}`,
        WEAK_TOPIC_QUIZ: "/api/ai/weak-topic-quiz",
        COMPARE_DOCUMENTS: "/api/ai/compare-documents",
        INTERVIEW_START: "/api/ai/interview/start",
        INTERVIEW_ANSWER: "/api/ai/interview/answer",
        CHAT: "/api/ai/chat",
        MULTI_CHAT: "/api/ai/multi-chat",
        GET_MULTI_CHAT_HISTORY: "/api/ai/multi-chat/history",
        CLEAR_MULTI_CHAT_HISTORY: "/api/ai/multi-chat/history",
        EXPLAIN_CONCEPT: "/api/ai/explain-concept",
        GET_CHAT_HISTORY: (documentId) => `/api/ai/chat-history/${documentId}`,
    },

    FLASHCARDS: {
        GET_ALL_FLASHCARD_SETS: "/api/flashcards",
        GET_DUE_FLASHCARDS: "/api/flashcards/due/cards",
        GET_FLASHCARD_FOR_DOCUMENT: (documentId) => `/api/flashcards/${documentId}`,
        REVIEW_FLASHCARD: (cardId) => `/api/flashcards/${cardId}/review`,
        REVIEW_FLASHCARD_SRS: (cardId) => `/api/flashcards/${cardId}/review-srs`,
        TOGGLE_STAR: (cardId) => `/api/flashcards/${cardId}/star`,
        DELETE_FLASHCARD_SET: (id) => `/api/flashcards/${id}`,
    },
    QUIZZES: {
        GET_QUIZZES_FOR_DOCUMENT: (documentId) => `/api/quizzes/${documentId}`,
        GET_QUIZ_BY_ID: (id) => `/api/quizzes/quiz/${id}`,
        SUBMIT_QUIZ: (id) => `/api/quizzes/${id}/submit`,
        GET_QUIZ_RESULTS: (id) => `/api/quizzes/${id}/results`,
        DELETE_QUIZ: (id) => `/api/quizzes/${id}`,
    },
    PROGRESS: {
        GET_DASHBOARD: "/api/progress/dashboard",
        GET_STUDY_PLAN: "/api/progress/study-plan",
        GENERATE_STUDY_PLAN: "/api/progress/study-plan/generate",
        TOGGLE_STUDY_PLAN_TASK: (taskId) => `/api/progress/study-plan/task/${taskId}`,
        GET_HISTORY: "/api/progress/history",
        DELETE_HISTORY: (id) => id ? `/api/progress/history/${id}` : "/api/progress/history",
    }
};
