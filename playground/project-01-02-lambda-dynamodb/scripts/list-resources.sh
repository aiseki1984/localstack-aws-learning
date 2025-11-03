#!/bin/bash

# AWSリソース確認スクリプト (LocalStack用)

# 環境変数の設定
export AWS_ACCESS_KEY_ID="test"
export AWS_SECRET_ACCESS_KEY="test"
export AWS_DEFAULT_REGION="us-east-1"
export AWS_REGION="us-east-1"

# LocalStackエンドポイントを環境変数から取得
if [ -z "$AWS_ENDPOINT_URL" ]; then
  echo "❌ AWS_ENDPOINT_URL環境変数が設定されていません"
  echo "   例: export AWS_ENDPOINT_URL=http://localstack:4566"
  exit 1
fi

echo "🔍 LocalStack リソース確認"
echo "📋 エンドポイント: $AWS_ENDPOINT_URL"
echo ""

# Lambda関数の確認
echo "⚡ Lambda関数:"
aws lambda list-functions \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION \
  --query 'Functions[*].FunctionName' \
  --output table || echo "  Lambda関数が見つかりません"

echo ""

# DynamoDBテーブルの確認
echo "📊 DynamoDBテーブル:"
aws dynamodb list-tables \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION \
  --query 'TableNames' \
  --output table || echo "  DynamoDBテーブルが見つかりません"

echo ""

# IAMロールの確認
echo "🔐 IAMロール:"
aws iam list-roles \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION \
  --query 'Roles[*].RoleName' \
  --output table || echo "  IAMロールが見つかりません"

echo ""
echo "💡 削除したい場合は ./scripts/cleanup.sh を実行してください"