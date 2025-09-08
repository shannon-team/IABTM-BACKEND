import mongoose from 'mongoose';

const expertSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId, ref: 'User',
        required: true
    },
    masterclasses: [
        {
            type: mongoose.Schema.Types.ObjectId, ref: 'masterclass'
        }
    ],
    expertTag: [
        {
            type: String
        }
    ], 
    about: {
        type:String
    },
    education: [
        {
            school: { type: String, required: true },
            degree: { type: String, required: true },
            startyr: { type: Date, required: true },
            endyr: { type: Date, required: true }
        }
    ],    
    certification: [
        {
            title: { type: String, required: true },
            image: { type: String } 
        }
    ],
    expertise : {
        type : String
    },
    topRated : {
        type : Boolean
    }

}, { timestamps: true });


const Expert = mongoose.model('Expert', expertSchema);

export default Expert;
