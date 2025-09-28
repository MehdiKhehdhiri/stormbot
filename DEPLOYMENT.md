# StormBot Frontend - Vercel Deployment Guide

## 🚀 Deploying to Vercel

### Prerequisites
- Vercel account (free tier available)
- GitHub repository with your StormBot code
- Vercel CLI (optional but recommended)

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Add StormBot frontend"
   git branch -M main
   git remote add origin https://github.com/yourusername/stormbot.git
   git push -u origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with GitHub
   - Click "New Project"
   - Import your StormBot repository

3. **Configure Environment Variables**
   In Vercel dashboard, add these environment variables:
   ```
   API_KEY=your_blackbox_ai_api_key_here
   NODE_ENV=production
   ```

4. **Deploy**
   - Vercel will automatically detect the configuration
   - Click "Deploy"
   - Your app will be available at `https://your-project-name.vercel.app`

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

4. **Set Environment Variables**
   ```bash
   vercel env add API_KEY
   # Enter your BlackBox AI API key when prompted
   ```

5. **Redeploy with Environment Variables**
   ```bash
   vercel --prod
   ```

## ⚠️ Important Considerations

### 1. **Serverless Limitations**
- **Test Duration**: Vercel functions have a 10-second timeout on free tier (5 minutes on Pro)
- **Long-running Tests**: Tests longer than the timeout will be terminated
- **Concurrent Tests**: Limited by Vercel's concurrent function execution limits

### 2. **Recommended Architecture for Production**

For production use, consider this hybrid approach:

**Option A: Frontend-Only on Vercel**
- Deploy only the frontend (`public/` folder) to Vercel
- Host the backend server on a platform that supports long-running processes:
  - Railway
  - Render
  - DigitalOcean App Platform
  - AWS EC2/ECS
  - Google Cloud Run

**Option B: Separate Deployments**
- **Frontend**: Vercel (static hosting)
- **Backend**: Railway/Render (for the Express server)
- **Load Testing**: Dedicated server or container service

### 3. **Configuration for Separate Deployments**

If deploying frontend and backend separately:

1. **Update API URLs in `public/js/app.js`**:
   ```javascript
   // Replace localhost URLs with your backend URL
   const API_BASE_URL = process.env.NODE_ENV === 'production' 
     ? 'https://your-backend-url.com' 
     : 'http://localhost:3000';
   ```

2. **Enable CORS on backend** (already configured in server.js)

## 🔧 Vercel-Specific Optimizations

### 1. **Static File Optimization**
The `vercel.json` configuration optimizes static file serving:
- CSS, JS, and HTML files are served via Vercel's CDN
- API routes are handled by serverless functions

### 2. **Environment Variables**
Set these in Vercel dashboard:
```
API_KEY=your_blackbox_ai_api_key
NODE_ENV=production
PORT=3000
```

### 3. **Build Configuration**
The project is configured to work with Vercel's build system:
- No build step required (vanilla JS/HTML/CSS)
- Server.js automatically becomes a serverless function

## 🚀 Quick Deploy Commands

```bash
# Clone and deploy in one go
git clone https://github.com/yourusername/stormbot.git
cd stormbot
vercel
```

## 📊 Monitoring and Logs

- **Vercel Dashboard**: View function logs and analytics
- **Real-time Logs**: `vercel logs --follow`
- **Function Analytics**: Available in Vercel Pro plan

## 🔒 Security Considerations

1. **Environment Variables**: Never commit API keys to Git
2. **CORS**: Configured for security in production
3. **Rate Limiting**: Consider implementing rate limiting for API endpoints

## 🎯 Production Recommendations

For heavy load testing usage:
1. **Use Vercel for frontend only**
2. **Deploy backend on Railway/Render**
3. **Use dedicated servers for actual load testing**
4. **Implement proper monitoring and alerting**

## 📞 Support

- Vercel Documentation: https://vercel.com/docs
- StormBot Issues: Create issues in your GitHub repository
