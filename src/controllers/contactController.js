import { ApiResponse } from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config({
    path: './.env'
});

const sendContactEmail = async (name, email, subject, message) => {
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
            to: 'info@iambetterthanme.com',
            subject: `Contact Form Submission: ${subject}`,
            html: `
                <h2>New Contact Form Submission</h2>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Subject:</strong> ${subject}</p>
                <p><strong>Message:</strong></p>
                <p>${message}</p>
                <hr>
                <p><small>This message was sent from the contact form on your website.</small></p>
            `
        };

        return new Promise((resolve, reject) => {
            transporter.sendMail(mailOptions, function (err, info) {
                if (err) {
                    console.log('Email sending error:', err);
                    reject(err);
                } else {
                    console.log('Contact email sent successfully - ', info.response);
                    resolve(info);
                }
            });
        });
    } catch (error) {
        console.log('Contact email error:', error);
        throw error;
    }
};

export const submitContactForm = async (req, res) => {
    const { name, email, subject, message } = req.body;

    // Validation
    if (!name || !email || !subject || !message) {
        return res.status(400).json(new ApiResponse(400, null, "All fields are required"));
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json(new ApiResponse(400, null, "Please enter a valid email address"));
    }

    try {
        // Send email to info@iambetterthanme.com
        await sendContactEmail(name, email, subject, message);

        return res.status(200).json(new ApiResponse(200, null, "Message sent successfully! We'll get back to you soon."));
    } catch (error) {
        console.error('Contact form submission error:', error);
        return res.status(500).json(new ApiResponse(500, null, "Failed to send message. Please try again later."));
    }
};

export const submitHowItWorksForm = async (req, res) => {
    const { name, email, subject, message } = req.body;

    // Validation
    if (!name || !email || !subject || !message) {
        return res.status(400).json(new ApiResponse(400, null, "All fields are required"));
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json(new ApiResponse(400, null, "Please enter a valid email address"));
    }

    try {
        // Send email to info@iambetterthanme.com with "How It Works" prefix
        await sendContactEmail(name, email, `How It Works - ${subject}`, message);

        return res.status(200).json(new ApiResponse(200, null, "Message sent successfully! We'll get back to you soon."));
    } catch (error) {
        console.error('How it works form submission error:', error);
        return res.status(500).json(new ApiResponse(500, null, "Failed to send message. Please try again later."));
    }
}; 