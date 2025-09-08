import mongoose from 'mongoose';

const pendingUserSchema = new mongoose.Schema({
    name: {
        type: String,
        // required: true,
        trim: true,
    },
    profileName: {
        type: String,
    },
    phoneNumber: {
        type: String,
        // required: true
    },
    email: {
        type: String,
    },
    isOnboarded: {
        type: Boolean
    },
    password: {
        type: String,
        minlength: 6,
        // required: true,
    },
    role: {
        type: String
    },
    profilePicture: {
        type: String,
        required: true,
    },
    otp: {
        type: Number
    },
    otpExpiration: {
        type: Date
    },
    attributes: {
        currentSelf: {
            type: [String], // Array of user behaviors for current self
            default: ["Unrelaxed", "Absent minded", "Afraid", "Exhausted"]
        },
        imagineSelf: {
            type: [String], // Array of user behaviors for imagined self
            default: ["Intelligent", "Wealthy", "Patient", "Social"]
        },
        learningStyle: {
            type: [String],
            default: ['visual'] // Default learning style
        },
        mediaPreferences: {
            type: [String], // Array of media preferences
            default: ["Books", "Audio", "Video"]
        }

    },


}, { timestamps: true });


const PendingUser = mongoose.model('PendingUser', pendingUserSchema);

export default PendingUser;
