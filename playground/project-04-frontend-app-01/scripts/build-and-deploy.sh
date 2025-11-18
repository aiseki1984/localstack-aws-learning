#!/bin/bash

# フロントエンドをビルドしてデプロイする統合スクリプト

set -e

echo "========================================="
echo "フロントエンドのビルドとデプロイ"
echo "========================================="

# 1. Next.jsアプリをビルド
echo "🔨 Next.jsアプリをビルド中..."
cd frontend-nextjs
npm run build
cd ..

# 2. S3にデプロイ
echo ""
./scripts/deploy-frontend.sh
