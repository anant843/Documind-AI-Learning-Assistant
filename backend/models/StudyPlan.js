import mongoose from 'mongoose';

const studyPlanSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        title: {
            type: String,
            default: 'Weekly Adaptive Study Schedule',
        },
        scheduleMode: {
            type: String,
            enum: ['Weak topic recovery', 'Exam preparation', 'Revision mode', 'New document learning'],
            default: 'Weak topic recovery',
        },
        days: [
            {
                dayName: {
                    type: String, // e.g. "Monday", "Day 1"
                    required: true,
                },
                date: {
                    type: Date,
                },
                topic: {
                    type: String,
                    required: true,
                },
                objective: {
                    type: String,
                    default: '',
                },
                learningFlowStage: {
                    type: String,
                    default: 'Learn',
                },
                documentTitle: {
                    type: String,
                    default: '',
                },
                documentId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Document',
                },
                focusAreas: {
                    type: [String],
                    default: [],
                },
                estimatedMinutes: {
                    type: Number,
                    default: 45,
                },
                actionType: {
                    type: String,
                    enum: [
                        'Notes',
                        'Flashcards',
                        'Quiz',
                        'Revision',
                        'Practice',
                        'Assessment',
                        'Read & Notes',
                        'Quiz Practice',
                        'Flashcard Review',
                        'Deep Dive'
                    ],
                    default: 'Notes',
                },
                category: {
                    type: String,
                    default: 'Notes',
                },
                isCompleted: {
                    type: Boolean,
                    default: false,
                },
            },
        ],
        weakTopicsAddressed: {
            type: [String],
            default: [],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

studyPlanSchema.index({ userId: 1, isActive: 1 });

const StudyPlan = mongoose.model('StudyPlan', studyPlanSchema);
export default StudyPlan;
