import mongoose from "mongoose";

const optionSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        enum: ['A', 'B', 'C', 'D']
    },
    text: {
        type: String,
        required: true,
        trim: true
    }
}, { _id: false });

const questionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true,
        trim: true
    },
    options: {
        type: [optionSchema],
        required: true,
        validate: [
            {
                validator: function (options) {
                    return Array.isArray(options) && options.length === 4;
                },
                message: 'Each question must have exactly 4 options (A, B, C, D).'
            }
        ]
    },
    correctOption: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        enum: ['A', 'B', 'C', 'D']
    },
    correctAnswer: {
        type: String,
        default: ''
    },
    explanation: {
        type: String,
        default: '',
        trim: true
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium'
    }
}, { _id: true });

// Ensure correctOption exists in options array before saving
questionSchema.pre('validate', function () {
    if (this.options && Array.isArray(this.options) && this.correctOption) {
        const optionExists = this.options.some(
            (opt) => opt.id && opt.id.toUpperCase() === this.correctOption.toUpperCase()
        );
        if (!optionExists) {
            throw new Error(`correctOption "${this.correctOption}" does not exist in options array.`);
        }
    }
});

const quizSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    questions: {
        type: [questionSchema],
        required: true,
        validate: [
            {
                validator: function (questions) {
                    return Array.isArray(questions) && questions.length > 0;
                },
                message: 'Quiz must contain at least one question.'
            }
        ]
    },
    userAnswer: [{
        questionIndex: {
            type: Number,
            required: true
        },
        selectedOption: {
            type: String,
            default: '',
            trim: true,
            uppercase: true
        },
        selectedAnswer: {
            type: String,
            default: '',
            trim: true
        },
        isCorrect: {
            type: Boolean,
            required: true
        },
        answeredAt: {
            type: Date,
            default: Date.now
        }
    }],
    score: {
        type: Number,
        default: 0
    },
    totalQuestions: {
        type: Number,
        required: true
    },
    completedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

quizSchema.index({ userId: 1, documentId: 1 });

const Quiz = mongoose.model('Quiz', quizSchema);
export default Quiz;