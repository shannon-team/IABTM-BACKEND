import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config({
    path: './.env'
});

const sendVerificationEmail = async (name, email , otp) => {
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: emailUser,
                pass: emailPassword
            }
        });

        const mailOptions = {
            from: emailUser,
            to: email,
            subject: 'Verify your Email',
            html: `<p>Hi ${name},</p>
                   <p>Enter the following OTP to reset your password: <strong>${otp}</strong> . It will be expired in 5 minutes.</p>`
        };

        transporter.sendMail(mailOptions, function (err, info) {
            if (err) {
                console.log(err);
            } else {
                console.log('Mail has been sent - ', info.response);
            }
        });
    } catch (error) {
        console.log(error);
    }
}

export default sendVerificationEmail;
