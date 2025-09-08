# Development Guide

## Quick Start

1. **Install dependencies:**
   ```bash
   npm run install:all
   ```

2. **Setup environment files:**
   ```bash
   npm run setup
   ```

3. **Start both servers:**
   ```bash
   npm run dev
   ```

## Troubleshooting

### Network Errors
If you encounter "AxiosError: Network Error":

1. **Check if servers are running:**
   ```bash
   netstat -ano | findstr :8000  # Backend
   netstat -ano | findstr :3000  # Frontend
   ```

2. **Restart servers:**
   ```bash
   # Kill existing processes
   taskkill /F /IM node.exe
   
   # Restart
   npm run dev
   ```

3. **Check environment files:**
   - Client: `IABTM/client/.env.local`
   - Server: `IABTM/server/.env`
   - Both should use `localhost` for local development

### Port Conflicts
If ports are in use:
1. Find what's using the port: `netstat -ano | findstr :3000`
2. Kill the process: `taskkill /PID <PID> /F`
3. Restart the application

### MongoDB Connection Issues
If MongoDB connection fails:
1. Check internet connection
2. Verify MongoDB Atlas credentials
3. Check if IP is whitelisted in MongoDB Atlas

## Environment Configuration

### For Local Development
- Use `localhost` for all URLs
- Backend: `http://localhost:8000`
- Frontend: `http://localhost:3000`

### For Production
- Use actual IP addresses or domain names
- Update CORS configuration accordingly

## Common Issues

1. **IP Address Changes**: Network changes can cause IP addresses to change
2. **Port Conflicts**: Other applications might use the same ports
3. **Environment File Corruption**: Files might get corrupted during editing
4. **MongoDB Connection**: Network issues can affect database connectivity

## Best Practices

1. Always use `localhost` for local development
2. Keep environment files in version control (with sensitive data removed)
3. Use the provided npm scripts for consistent setup
4. Check network connectivity before starting development
5. Monitor console logs for connection errors 