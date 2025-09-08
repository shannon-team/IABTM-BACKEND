import dotenv from 'dotenv';
import twilio from 'twilio';
dotenv.config({
    path: './.env'
});

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN

// Only initialize Twilio client if credentials are available
let twilioClient = null;
if (accountSid && authToken) {
    twilioClient = new twilio(accountSid, authToken);
}

const sendVerificationSms = async(otp, phoneNumber) => {
    // Check if Twilio client is available
    if (!twilioClient) {
        console.warn('Twilio credentials not configured. SMS functionality disabled.');
        return;
    }
    
    try {
        await twilioClient.messages.create({
            body: `Your OTP is ${otp}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phoneNumber
        });
    } catch (error) {
        console.error('Error sending SMS:', error);
        throw error;
    }
}

export default sendVerificationSms