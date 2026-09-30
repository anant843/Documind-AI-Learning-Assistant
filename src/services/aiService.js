import axiosInstance from "../utils/axioInstance";
import { API_PATHS } from "../utils/apiPaths";

const formatError = (error) => {
	const msg = error?.response?.data?.error || error?.message || "Request failed";
	const status = error?.response?.status;
	const err = new Error(msg);
	if (status) err.status = status;
	return err;
};

const generateFlashcards = async (documentId, options) => {
	try {
		const res = await axiosInstance.post(API_PATHS.AI.GENERATE_FLASHCARDS, {
			documentId,
			...options,
		});
		return res.data;
	} catch (error) {
		throw formatError(error);
	}
};

const generateQuiz = async (documentId, options ) => {
	try {
		const res = await axiosInstance.post(API_PATHS.AI.GENERATE_QUIZ, {
			documentId,
			...options,
		});
		return res.data;
	} catch (error) {
		throw formatError(error);
	}
};

const generateSummary = async (documentId) => {
	try {
		const res = await axiosInstance.post(API_PATHS.AI.GENERATE_SUMMARY, {
			documentId,
	
		});
		return res.data.data;
	} catch (error) {
		throw formatError(error);
	}
};

const chat = async (documentId, message) => {
	try {
		const res = await axiosInstance.post(API_PATHS.AI.CHAT, {
			documentId,
			question: message,
	
		});
		return res.data;
	} catch (error) {
		throw formatError(error);
	}
};

const explainConcept = async (documentId, concept) => {
	try {
		const res = await axiosInstance.post(API_PATHS.AI.EXPLAIN_CONCEPT, {
			documentId,
			concept,
	
		});
		return res.data.data;
	} catch (error) {
		throw formatError(error);
	}
};

const getChatHistory = async (documentId) => {
	try {
		const res = await axiosInstance.get(API_PATHS.AI.GET_CHAT_HISTORY(documentId));
		return res.data;
	} catch (error) {
		throw formatError(error);
	}
};

const multiChat = async (question, documentIds = []) => {
	try {
		const res = await axiosInstance.post(API_PATHS.AI.MULTI_CHAT, {
			question,
			documentIds,
		});
		return res.data;
	} catch (error) {
		throw formatError(error);
	}
};

const getMultiChatHistory = async () => {
	try {
		const res = await axiosInstance.get(API_PATHS.AI.GET_MULTI_CHAT_HISTORY);
		return res.data;
	} catch (error) {
		throw formatError(error);
	}
};

const clearMultiChatHistory = async () => {
	try {
		const res = await axiosInstance.delete(API_PATHS.AI.CLEAR_MULTI_CHAT_HISTORY);
		return res.data;
	} catch (error) {
		throw formatError(error);
	}
};

const generateNotes = async (documentId) => {
	try {
		const res = await axiosInstance.post(API_PATHS.AI.GENERATE_NOTES, {
			documentId,
		});
		return res.data;
	} catch (error) {
		throw formatError(error);
	}
};

const generateMindMap = async (documentId) => {
	try {
		const res = await axiosInstance.post(API_PATHS.AI.GENERATE_MINDMAP, {
			documentId,
		});
		return res.data;
	} catch (error) {
		throw formatError(error);
	}
};

const generateWeakTopicQuiz = async (documentId, numQuestions = 5) => {
	try {
		const res = await axiosInstance.post(API_PATHS.AI.WEAK_TOPIC_QUIZ, {
			documentId,
			numQuestions,
		});
		return res.data;
	} catch (error) {
		throw formatError(error);
	}
};

const compareDocuments = async (docId1, docId2, query = '') => {
	try {
		const res = await axiosInstance.post(API_PATHS.AI.COMPARE_DOCUMENTS, {
			docId1,
			docId2,
			query,
		});
		return res.data;
	} catch (error) {
		throw formatError(error);
	}
};

const startInterview = async (documentId) => {
	try {
		const res = await axiosInstance.post(API_PATHS.AI.INTERVIEW_START, {
			documentId,
		});
		return res.data;
	} catch (error) {
		throw formatError(error);
	}
};

const answerInterviewQuestion = async (payload) => {
	try {
		const res = await axiosInstance.post(API_PATHS.AI.INTERVIEW_ANSWER, payload);
		return res.data;
	} catch (error) {
		throw formatError(error);
	}
};

const generatePresentation = async (documentId, slideCount = 6) => {
	try {
		const res = await axiosInstance.post(API_PATHS.AI.GENERATE_PRESENTATION(documentId), { slideCount });
		return res.data;
	} catch (error) {
		throw formatError(error);
	}
};

const aiService = {
	generateFlashcards,
	generateQuiz,
	generateSummary,
	generateNotes,
	generateMindMap,
	generatePresentation,
	generateWeakTopicQuiz,
	compareDocuments,
	startInterview,
	answerInterviewQuestion,
	chat,
	multiChat,
	getMultiChatHistory,
	clearMultiChatHistory,
	explainConcept,
	getChatHistory,
};

export default aiService;

