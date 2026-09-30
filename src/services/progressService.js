import axiosInstance from "../utils/axioInstance";
import { API_PATHS } from "../utils/apiPaths";

const formatError = (error) => {
	const msg = error?.response?.data?.error || error?.message || "Request failed";
	const status = error?.response?.status;
	const err = new Error(msg);
	if (status) err.status = status;
	return err;
};

const getDashboard = async () => {
	try {
		const res = await axiosInstance.get(API_PATHS.PROGRESS.GET_DASHBOARD);
		return res.data;
	} catch (error) {
		throw formatError(error);
	}
};

const getStudyPlan = async () => {
	try {
		const res = await axiosInstance.get(API_PATHS.PROGRESS.GET_STUDY_PLAN);
		return res.data;
	} catch (error) {
		throw formatError(error);
	}
};

const generateStudyPlan = async () => {
	try {
		const res = await axiosInstance.post(API_PATHS.PROGRESS.GENERATE_STUDY_PLAN);
		return res.data;
	} catch (error) {
		throw formatError(error);
	}
};

const toggleStudyPlanTask = async (taskId) => {
	try {
		const res = await axiosInstance.patch(API_PATHS.PROGRESS.TOGGLE_STUDY_PLAN_TASK(taskId));
		return res.data;
	} catch (error) {
		throw formatError(error);
	}
};

const getHistory = async () => {
	try {
		const res = await axiosInstance.get(API_PATHS.PROGRESS.GET_HISTORY);
		return res.data;
	} catch (error) {
		throw formatError(error);
	}
};

const deleteHistoryItem = async (id) => {
	try {
		const res = await axiosInstance.delete(API_PATHS.PROGRESS.DELETE_HISTORY(id));
		return res.data;
	} catch (error) {
		throw formatError(error);
	}
};

const progressService = {
	getDashboard,
	getStudyPlan,
	generateStudyPlan,
	toggleStudyPlanTask,
	getHistory,
	deleteHistoryItem,
};

export default progressService;
