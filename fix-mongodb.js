#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '.env');

console.log('🔧 Fixing MongoDB connection...');

// Read current .env file
let envContent = '';
try {
    envContent = fs.readFileSync(envPath, 'utf8');
} catch (error) {
    console.error('❌ Error reading .env file:', error.message);
    process.exit(1);
}

// Replace MongoDB URL with local connection
const updatedEnvContent = envContent.replace(
    /MONGODB_URL=.*/,
    'MONGODB_URL=mongodb://localhost:27017'
);

try {
    fs.writeFileSync(envPath, updatedEnvContent);
    console.log('✅ MongoDB URL updated to local connection!');
    console.log('📁 Updated file:', envPath);
    console.log('\n💡 Next steps:');
    console.log('1. Install MongoDB locally (if not already installed)');
    console.log('2. Start MongoDB service');
    console.log('3. Restart the server with: npm start');
} catch (error) {
    console.error('❌ Error updating .env file:', error.message);
} 