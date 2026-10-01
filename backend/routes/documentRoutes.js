import express from 'express';

import {
    uploadDocument,
    getDocuments,
    getDocument,
    getDocumentFile,
    deleteDocument,

} from '../controllers/documentController.js';

import protect from '../middleware/auth.js';
import upload from '../config/multer.js';


const router = express.Router();

// all routes are protected
router.use(protect);


router.post('/upload', upload.single('file'), uploadDocument);
router.get('/', getDocuments);
router.get('/:id/file', getDocumentFile);
router.get('/:id', getDocument);
router.delete('/:id', deleteDocument);

export default router;
