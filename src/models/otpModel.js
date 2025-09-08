import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
    email : {
        type : String,
    },
    phoneNumber: {
        type: String,
        unique: true,
        sparse: true
    },
    otp : {
        type: Number
    }
    , otpExpiration : {
        type : Date
    }
}, { timestamps: true });

const Otp = mongoose.model('Otp', otpSchema);

export default Otp;




