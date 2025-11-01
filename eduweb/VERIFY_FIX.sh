#!/bin/bash

echo "========================================"
echo "Goldsky 404 Fix - Verification Script"
echo "========================================"
echo ""

echo "1. Testing Goldsky endpoint connectivity..."
node test-goldsky-endpoint.js

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Endpoint test failed. Check:"
    echo "   - Internet connection"
    echo "   - Goldsky API status"
    echo "   - Endpoint URL in .env.local"
    exit 1
fi

echo ""
echo "2. Checking .env.local configuration..."
if grep -q "NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT=https://" .env.local; then
    echo "✅ Endpoint configured"
    grep "NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT" .env.local | head -1
else
    echo "❌ Endpoint not configured in .env.local"
    exit 1
fi

echo ""
echo "3. Clearing Next.js cache..."
rm -rf .next
echo "✅ Cache cleared"

echo ""
echo "4. Building application..."
npm run build > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed. Run 'npm run build' to see errors"
    exit 1
fi

echo ""
echo "========================================"
echo "✅ ALL CHECKS PASSED"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Start dev server: npm run dev"
echo "2. Visit: http://localhost:3000/goldsky-test"
echo "3. Visit: http://localhost:3000/myCourse"
echo "4. Check browser console for '[Goldsky]' logs"
echo ""
