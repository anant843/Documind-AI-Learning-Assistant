import dotenv from "dotenv";
import path from 'path';
import { fileURLToPath } from "url";

// es6 module __dirname alternative
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load from backend/.env and root .env (root overrides or supplies missing variables)
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '../.env'), override: true });

import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';
import errorHandler from  './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import flashcardRoutes from './routes/flashcardRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import progressRoutes from './routes/progressRoutes.js';
import { authLimiter, aiLimiter, generalLimiter } from './middleware/rateLimiter.js';



// initial express app
const app = express();  

// database connection happens in startServer function below

// midllware handler CORS 
// frontend at  http://localhost:5173/
// backend at 5000 , it alwo the access 
app.use(
    cors({
        origin:"*",
        methods:["GET","POST","PUT","DELETE"],
        allowedHeaders:["Content-Type","Authorization"],
        credentials:true,
    })
)

app.use(express.json())  //get the json from the request body 
app.use(express.urlencoded({ extended: true }));  //parse html form bodies

// static folder for updas

app.use('/uploads',express.static(path.join(__dirname,'uploads')));

// Rate Limiting & Routes
app.use('/api', generalLimiter);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/ai', aiLimiter, aiRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/progress', progressRoutes);





app.use(errorHandler);


app.use((req,res)=>{
    res.status(404).json({
        success:false,
        error:'Route node found',
        statusCode:404
    });
});


// start server
const PORT = process.env.PORT || 8000;

const startServer = async () => {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();

process.on('unhandledRejection', (err) => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
});
