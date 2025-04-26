#!/bin/bash
set -e

echo "🚀 Starting deployment process for Light API..."

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building TypeScript code..."
npm run rebuild

echo "📦 Creating deployment package..."
npm run package

echo "✅ Deployment package created successfully: lambda.zip"
echo "📏 Package size: $(du -h lambda.zip | cut -f1)"

echo "🎉 Deployment preparation complete!"
