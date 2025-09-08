# IABTM Backend Server

Complete backend in Node.js for the IABTM application.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. **Clone and install dependencies**
   ```bash
   cd server
   npm install
   ```

2. **Setup environment variables**
   ```bash
   npm run setup
   ```
   This will create a `.env` file with default values.

3. **Configure your .env file**
   Edit the `.env` file with your actual configuration:
   ```env
   MONGODB_URL=mongodb://localhost:27017
   JWT_SECRET=your-super-secret-jwt-key
   PORT=8000
   ```

4. **Start the server**
   ```bash
   npm start
   ```

## 📋 Environment Variables

### Required
- `MONGODB_URL` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens

### Optional
- `PORT` - Server port (default: 8000)
- `NODE_ENV` - Environment (development/production)
- `CORS_ORIGIN` - CORS origin (default: http://localhost:3000)
- `STRIPE_SECRET_KEY` - Stripe secret key for payments
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name for file uploads
- `SMTP_HOST` - SMTP host for email functionality

## 🔧 Available Scripts

- `npm run setup` - Create .env file with default values
- `npm start` - Start development server with nodemon
- `npm run dev` - Start development server with nodemon
- `npm run prod` - Start production server

## 🗄️ Database Setup

### Local MongoDB
1. Install MongoDB locally
2. Start MongoDB service
3. Use connection string: `mongodb://localhost:27017`

### MongoDB Atlas
1. Create a MongoDB Atlas account
2. Create a cluster
3. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net`

## 🚨 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   ```
   Error: MongoParseError: Invalid scheme, expected connection string to start with "mongodb://" or "mongodb+srv://"
   ```
   **Solution**: Check your `MONGODB_URL` in `.env` file

2. **Port Already in Use**
   ```
   Error: EADDRINUSE
   ```
   **Solution**: Change PORT in .env file or kill the process using the port

3. **JWT Secret Warning**
   ```
   JWT_SECRET not found in environment variables
   ```
   **Solution**: Add JWT_SECRET to your .env file

4. **Missing Environment Variables**
   ```
   Missing required environment variables: MONGODB_URL
   ```
   **Solution**: Run `npm run setup` to create .env file

### Health Check
Once the server is running, you can check if it's working:
```bash
curl http://localhost:8000/
```

Expected response:
```json
{
  "message": "Server is up and running",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "development"
}
```

## 📁 Project Structure

```
server/
├── src/
│   ├── controllers/     # Route controllers
│   ├── models/         # Database models
│   ├── routes/         # API routes
│   ├── middlewares/    # Custom middlewares
│   ├── helpers/        # Utility functions
│   └── database/       # Database connection
├── app.js              # Express app configuration
├── index.js            # Server entry point
├── setup.js            # Environment setup script
└── package.json        # Dependencies and scripts
```

## 🔐 Security Notes

- Change `JWT_SECRET` to a secure random string in production
- Use environment variables for all sensitive data
- Enable HTTPS in production
- Set `NODE_ENV=production` for production deployments

## 📞 Support

If you encounter any issues, check the troubleshooting section above or contact the development team. 