#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

console.log('🚀 IABTM Server Setup');
console.log('=====================\n');

// Check if .env already exists
if (fs.existsSync(envPath)) {
    console.log('✅ .env file already exists');
    console.log('📝 Current configuration:');
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    lines.forEach(line => {
        if (line.trim() && !line.startsWith('#')) {
            const [key] = line.split('=');
            console.log(`   ${key}`);
        }
    });
    
    console.log('\n💡 To reconfigure, delete .env file and run this script again');
} else {
    console.log('📝 Creating .env file...');
    
    const envContent = `# Server Configuration
PORT=8000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URL=mongodb://localhost:27017
# If using MongoDB Atlas, use: mongodb+srv://username:password@cluster.mongodb.net

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRY=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Stripe Configuration (optional - for payment functionality)
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret

# Cloudinary Configuration (optional - for file uploads)
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Email Configuration (optional - for email functionality)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-email-password

# Spotify Configuration (optional - for music features)
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
`;

    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file created successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Edit .env file with your actual configuration values');
    console.log('2. Make sure MongoDB is running (local or Atlas)');
    console.log('3. Run: npm start');
    console.log('\n⚠️  Important: Change JWT_SECRET to a secure random string in production!');
}

console.log('\n�� Setup complete!'); 