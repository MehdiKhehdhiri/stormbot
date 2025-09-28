#!/bin/bash

echo "🚀 Deploying StormBot Frontend to Vercel"
echo "======================================="

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📝 Initializing Git repository..."
    git init
    git add .
    git commit -m "Initial commit: StormBot frontend"
fi

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
vercel --prod

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Set environment variables in Vercel dashboard:"
echo "   - API_KEY=your_blackbox_ai_api_key"
echo "   - NODE_ENV=production"
echo ""
echo "2. Your StormBot frontend is now live!"
echo "3. Note: Load testing will be limited in serverless environment"
echo "4. For full functionality, consider deploying backend separately"
echo ""
echo "🔗 Access your deployment at the URL provided above"
