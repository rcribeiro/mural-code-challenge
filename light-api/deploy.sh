#!/bin/bash
set -e

echo "🚀 Starting deployment process for Light API..."

# Install dependencies if needed
if [ "$1" == "--install" ] || [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Build TypeScript code
echo "🔨 Building TypeScript code..."
npm run build

# Build optimized Lambda package with webpack
echo "📦 Creating optimized Lambda package..."
if [ ! -d "node_modules/webpack" ]; then
  npm install --save-dev webpack webpack-cli webpack-node-externals copy-webpack-plugin
fi

# Create dist directory if it doesn't exist
mkdir -p dist

# Run webpack build
npx webpack --config webpack.config.js

# Create Lambda deployment package
echo "📦 Creating Lambda deployment package..."
cd dist
npm install --production
zip -r ../lambda.zip .
cd ..

# Create Lambda layer if needed
if [ "$1" == "--with-layer" ]; then
  echo "📦 Creating Lambda layer for dependencies..."
  mkdir -p lambda-layer/nodejs
  cp package.json lambda-layer/nodejs/
  cd lambda-layer/nodejs
  npm install --production
  cd ../..
  zip -r lambda-layer.zip lambda-layer
  rm -rf lambda-layer
fi

# Deploy with Terraform if requested
if [ "$1" == "--deploy" ] || [ "$2" == "--deploy" ]; then
  echo "🚀 Deploying with Terraform..."
  cd ../terraform/api
  terraform init
  terraform apply -auto-approve
  cd ../../light-api
fi

echo "✅ Deployment package created successfully: lambda.zip"
echo "📏 Package size: $(du -h lambda.zip | cut -f1)"

echo "🎉 Deployment preparation complete!"
