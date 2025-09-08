# 🔧 MongoDB Connection Fix - Permanent Solution

## ❌ Current Issue
The MongoDB Atlas connection is timing out due to network/firewall restrictions.

## ✅ Permanent Solution: Local MongoDB

### Step 1: Install MongoDB Community Edition

#### For Windows:
1. Download MongoDB Community Server from: https://www.mongodb.com/try/download/community
2. Run the installer and follow the setup wizard
3. Make sure to install MongoDB as a service
4. Install MongoDB Compass (GUI tool) if prompted

#### For macOS:
```bash
# Using Homebrew
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB service
brew services start mongodb/brew/mongodb-community
```

#### For Linux (Ubuntu/Debian):
```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# Create list file for MongoDB
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update package database
sudo apt-get update

# Install MongoDB
sudo apt-get install -y mongodb-org

# Start MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod
```

### Step 2: Fix the .env File

Run this command in the server directory:
```bash
node fix-mongodb.js
```

This will automatically update your `.env` file to use local MongoDB.

### Step 3: Verify MongoDB is Running

#### Windows:
```bash
# Check if MongoDB service is running
sc query MongoDB

# If not running, start it:
net start MongoDB
```

#### macOS/Linux:
```bash
# Check MongoDB status
sudo systemctl status mongod

# If not running, start it:
sudo systemctl start mongod
```

### Step 4: Test MongoDB Connection

```bash
# Connect to MongoDB shell
mongosh

# You should see: "Current Mongosh Log ID: ..."
# Type 'exit' to quit
```

### Step 5: Restart the Server

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm start
```

## ✅ Expected Result

You should see:
```
🔌 Attempting to connect to MongoDB...
📡 Connection string (sanitized): mongodb://localhost:27017/iabtm
✅ MongoDB connected successfully on localhost
📊 Database: iabtm
✅ Server is running on 0.0.0.0:8000
💾 Database status: Connected
```

## 🔧 Alternative: MongoDB Atlas Fix

If you prefer to use MongoDB Atlas:

1. **Check Network Access**: Go to MongoDB Atlas → Network Access
2. **Add IP Address**: Add your current IP address (or 0.0.0.0/0 for all IPs)
3. **Check Database Access**: Ensure your user has proper permissions
4. **Update Connection String**: Use the connection string from Atlas dashboard

## 🚀 Quick Fix Commands

```bash
# 1. Run the fix script
node fix-mongodb.js

# 2. Install MongoDB (Windows - download from website)
# 3. Start MongoDB service
net start MongoDB

# 4. Restart server
npm start
```

## 📞 Support

If you still face issues:
1. Check if MongoDB is installed: `mongod --version`
2. Check if service is running: `sc query MongoDB` (Windows) or `sudo systemctl status mongod` (Linux/macOS)
3. Check MongoDB logs for errors
4. Ensure port 27017 is not blocked by firewall 