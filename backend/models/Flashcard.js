
import mongoose from "mongoose";


const flashcardSchema=new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    documentId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Document',
        required:true
    },
    cards:[{
        question:{
            type:String,
            required:true,
        },
        answer:{
            type:String,
            required:true,
        },
        difficulty:{
            type:String,
            enum:['easy','medium','hard'],
            default:'medium'
        },
        lastReviewed:
        {
            type:Date,
            default:null  
        },
        reviewCount:{
            type:Number,
            default:0
        },
        isStarred:{
            type:Boolean,
            default:false
        },
        nextReviewDate:{
            type:Date,
            default:null
        },
        intervalDays:{
            type:Number,
            default:0
        },
        repetitionCount:{
            type:Number,
            default:0
        },
        easeFactor:{
            type:Number,
            default:2.5
        },
        masteryStatus:{
            type:String,
            enum:['learning','reviewing','mastered'],
            default:'learning'
        }
    },],
},{
    timestamps:true
});


flashcardSchema.index({userId:1,documentId:1});

const Flashcard=mongoose.model('Flashcard',flashcardSchema);
export default Flashcard;