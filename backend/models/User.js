import mongoose from "mongoose";
import bcrypt from "bcryptjs";


const userSchema=new mongoose.Schema({
    username:{
        type:String,
        required:[true,'Username is required'],
        unique:true,
        trim:true,
        minlength:[3,'Username must be at least 3 characters long']
    },
    email:{
        type:String,
        required:[true,'Email is required'],
        unique:true,
        lowercase:true,
        match:[/^\S+@\S+\.\S+$/,'Please provide a valid email address']
    },
    password:{
        type:String,
        required:[true,'Password is required'],
        minlength:[6,'Password must be at least 6 characters long'],
        select:false //do not return password field by default
    },
    profileImage:{
        type:String,
        default:null
    },
    streak:{
        current:{ type:Number, default:1 },
        max:{ type:Number, default:1 },
        lastActiveDate:{ type:Date, default:Date.now }
    },
    xp:{
        type:Number,
        default:0
    },
    level:{
        type:Number,
        default:1
    },
    badges:[{
        id:{ type:String, required:true },
        name:{ type:String, required:true },
        icon:{ type:String, default:'🏅' },
        description:{ type:String, default:'' },
        unlockedAt:{ type:Date, default:Date.now }
    }],
    totalStudyMinutes:{
        type:Number,
        default:0
    },
    questionsAskedCount:{
        type:Number,
        default:0
    }
},{
    timestamps:true
});

// Update streak on user activity
userSchema.methods.updateActivityStreak = function() {
    const now = new Date();
    const lastActive = this.streak?.lastActiveDate ? new Date(this.streak.lastActiveDate) : null;
    
    if (!lastActive) {
        this.streak = { current: 1, max: 1, lastActiveDate: now };
        return;
    }

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const lastDate = new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate()).getTime();
    const diffDays = Math.round((today - lastDate) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
        this.streak.current = (this.streak.current || 0) + 1;
        if (this.streak.current > (this.streak.max || 1)) {
            this.streak.max = this.streak.current;
        }
        this.streak.lastActiveDate = now;
    } else if (diffDays > 1) {
        this.streak.current = 1;
        this.streak.lastActiveDate = now;
    } else {
        this.streak.lastActiveDate = now;
    }
};

// hash password before saving
userSchema.pre('save', async function() {
    if (!this.isModified('password')) {
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compare passwords method
userSchema.methods.matchPassword=async function(enteredPassword){
    return await bcrypt.compare(enteredPassword,this.password);
};

// 
const User=mongoose.model('User',userSchema);
export default User;