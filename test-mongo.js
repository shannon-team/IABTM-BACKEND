import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const testConnection = async () => {
    try {
        console.log('🔌 Testing MongoDB connection...');
        console.log('📝 Connection string:', process.env.MONGODB_URL);
        
        const connectionString = process.env.MONGODB_URL.includes('mongodb+srv://') 
            ? `${process.env.MONGODB_URL}/iabtm?retryWrites=true&w=majority`
            : `${process.env.MONGODB_URL}/iabtm`;

        const connection = await mongoose.connect(connectionString, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 10000,
            retryWrites: true,
            w: 'majority'
        });

        console.log('✅ MongoDB connected successfully!');
        console.log(`📊 Database: iabtm`);
        console.log(`🌐 Host: ${connection.connection.host}`);
        
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        console.log('\n🔧 Troubleshooting tips:');
        console.log('1. Check if MongoDB Atlas IP whitelist includes your IP');
        console.log('2. Verify username and password in connection string');
        console.log('3. Try using local MongoDB: MONGODB_URL=mongodb://localhost:27017');
        console.log('4. Check your internet connection');
    }
};

testConnection(); 