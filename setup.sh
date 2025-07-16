#!/bin/bash

# GM Merchandising Backend Setup Script

echo "🚀 Setting up GM Merchandising Backend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ and try again."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm and try again."
    exit 1
fi

echo "✅ npm found: $(npm --version)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your Firebase and Google Maps credentials"
    echo "   Required variables:"
    echo "   - FIREBASE_PROJECT_ID"
    echo "   - FIREBASE_PRIVATE_KEY_ID" 
    echo "   - FIREBASE_PRIVATE_KEY"
    echo "   - FIREBASE_CLIENT_EMAIL"
    echo "   - FIREBASE_CLIENT_ID"
    echo "   - FIREBASE_CLIENT_CERT_URL"
    echo "   - GOOGLE_MAPS_API_KEY"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your credentials"
echo "2. Run 'npm run dev' to start development server"
echo "3. Run 'npm test' to run tests"
echo "4. Check README.md for detailed documentation"
echo ""
echo "API will be available at: http://localhost:3000"
echo "Health check: http://localhost:3000/health"
