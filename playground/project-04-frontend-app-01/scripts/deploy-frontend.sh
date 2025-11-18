#!/bin/bash

# フロントエンドをS3にデプロイするスクリプト
# LocalStackではBucketDeploymentが動作しないため、手動でアップロード

set -e

BUCKET_NAME="todo-app-bucket"
FRONTEND_DIR="./frontend-nextjs/out"

echo "========================================="
echo "フロントエンドをS3にデプロイ"
echo "========================================="

# 1. フロントエンドのビルドディレクトリが存在するか確認
if [ ! -d "$FRONTEND_DIR" ]; then
  echo "❌ エラー: $FRONTEND_DIR が存在しません"
  echo "💡 次のコマンドでビルドしてください:"
  echo "   cd frontend-nextjs && npm run build && cd .."
  exit 1
fi

# 2. S3バケットが存在するか確認
if ! awslocal s3 ls s3://$BUCKET_NAME 2>/dev/null; then
  echo "❌ エラー: S3バケット '$BUCKET_NAME' が存在しません"
  echo "💡 次のコマンドでデプロイしてください:"
  echo "   cdklocal deploy"
  exit 1
fi

# 3. 既存のファイルを削除（オプション）
echo "📦 既存のファイルをクリア..."
awslocal s3 rm s3://$BUCKET_NAME --recursive --quiet || true

# 4. ファイルをアップロード
echo "⬆️  ファイルをアップロード中..."
awslocal s3 sync $FRONTEND_DIR s3://$BUCKET_NAME

# 5. アップロードされたファイルを確認
echo ""
echo "✅ デプロイ完了!"
echo ""
echo "📋 アップロードされたファイル:"
awslocal s3 ls s3://$BUCKET_NAME --recursive --human-readable

# 6. アクセスURLを表示
echo ""
echo "🌐 アクセスURL:"
echo "   http://$BUCKET_NAME.s3.localhost.localstack.cloud:4566/index.html"
echo ""
