#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '.env');

console.log('🔧 Creating .env file with your configuration...');

const envContent = `# Server Configuration
PORT=8000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URL=

# JWT Configuration
JWT_SECRET=
JWT_EXPIRY=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=dwgi96ynx
CLOUDINARY_API_KEY=
CLOUDINARY_API_KEY_SECRET=

# Twilio Configuration
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Email Configuration
EMAIL_USER=
EMAIL_PASSWORD=

# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Redis Configuration (Aiven)
AIVEN_HOST=iabtm-iabtm.i.aivencloud.com
AIVEN_USERNAME=default
AIVEN_PORT=18221
AIVEN_PASSWORD=
SERVICE_URI=

# Upstash Configuration
UPSTASH_ENDPOINT=calm-cougar-53192.upstash.io
UPSTASH_PASSWORD=
UPSTASH_PORT=6379

# API Keys
MUSIC_API_HOST=youtube-music4.p.rapidapi.com
MUSIC_API_KEY=
GEMINI_API_KEY=

# Shopify Configuration
Shopify_Token=
NEXT_PUBLIC_SHOPIFY_SHOP=
SHOPIFY_STOREFRONT_ACCESS_TOKEN=
shopify_Api_Key=
Shopify_Api_Secret=

# Backend URL
NEXT_PUBLIC_BACKEND_URL=

# Network Configuration
IP_ADDRESS=0.0.0.0
`;

try {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file created successfully!');
    console.log('📁 Location:', envPath);
    console.log('\n🚀 Now you can start the server with: npm start');
} catch (error) {
    console.error('❌ Error creating .env file:', error.message);
} 