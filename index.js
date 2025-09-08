import dotenv from 'dotenv';
dotenv.config({ path: "./.env" });
import {server} from './app.js'
import connectDB from './src/database/db.js'

const requiredEnvVars = ['MONGODB_URL'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
    console.log('📝 Please create a .env file with the following variables:');
    console.log('MONGODB_URL=mongodb://localhost:27017');
    console.log('JWT_SECRET=your-secret-key');
    console.log('PORT=8000 (optional)');
    process.exit(1);
}

const startServer = async () => {
    try {
        console.log('🚀 Starting IABTM server...');
        
        // Try to connect to database (but don't fail if it doesn't work)
        const dbConnected = await connectDB();
        
        if (!dbConnected) {
            console.log('⚠️ Database connection failed, but server will start anyway');
            console.log('🔧 Some features may not work until database is available');
        }
        
        // Start server
        const port = process.env.PORT || 8000;
        // const host = process.env.IP_ADDRESS || 'localhost';
        const host = process.env.IP_ADDRESS || "0.0.0.0";
       server.listen(port, host, () => {
    console.log(`✅ Server is running on ${host}:${port}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${port}/health`);
    console.log(`📊 API Base URL: http://localhost:${port}/api`);
});
        
        // Handle server errors
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`❌ Port ${port} is already in use`);
                console.log(`💡 Try using a different port: PORT=${port + 1}`);
            } else {
                console.error('❌ Server error:', error);
            }
            process.exit(1);
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

// Start the server
startServer();
