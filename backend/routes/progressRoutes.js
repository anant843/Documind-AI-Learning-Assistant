import express from 'express';
import {
    getDashboard,
    getStudyPlan,
    generateStudyPlan,
    toggleStudyPlanTask,
    getHistory,
    deleteHistoryItem
} from '../controllers/progressController.js';
import protect from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.get('/dashboard', getDashboard);
router.get('/study-plan', getStudyPlan);
router.post('/study-plan/generate', generateStudyPlan);
router.patch('/study-plan/task/:taskId', toggleStudyPlanTask);
router.get('/history', getHistory);
router.delete('/history/:id', deleteHistoryItem);
router.delete('/history', deleteHistoryItem);

export default router;
