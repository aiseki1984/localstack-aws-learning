#!/bin/bash

# Lambda + API Gateway クリーンアップスクリプト (LocalStack用)

set -e

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

# 設定（deploy.shと同じ値を使用）
FUNCTION_NAME="posts-api-lambda"
ROLE_NAME="lambda-api-execution-role"
API_NAME="posts-api"
TABLE_NAME="posts-table"

echo "🧹 Lambda + API Gateway + DynamoDB クリーンアップ開始"
echo "📋 削除対象:"
echo "   Function: $FUNCTION_NAME"
echo "   Role: $ROLE_NAME"
echo "   API: $API_NAME"
echo "   Table: $TABLE_NAME"
echo "   Endpoint: $AWS_ENDPOINT_URL"

# 1. DynamoDBテーブルの削除
echo "🗄️  DynamoDBテーブルを削除中..."
aws dynamodb delete-table \
  --table-name $TABLE_NAME \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION 2>/dev/null || echo "テーブルが見つかりません（既に削除済み）"

# 2. API Gatewayの削除
echo "🌐 API Gatewayを削除中..."
API_ID=$(aws apigateway get-rest-apis \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION \
  --query "items[?name=='$API_NAME'].id | [0]" \
  --output text 2>/dev/null || echo "")

if [ "$API_ID" != "None" ] && [ "$API_ID" != "" ]; then
  aws apigateway delete-rest-api \
    --rest-api-id $API_ID \
    --endpoint-url=$AWS_ENDPOINT_URL \
    --region $AWS_REGION || echo "API Gatewayが見つかりません（既に削除済み）"
  echo "   ✓ API Gateway削除: $API_ID"
else
  echo "   ⚠️ API Gatewayが見つかりません（既に削除済み）"
fi

# 3. Lambda関数の削除
echo "⚡ Lambda関数を削除中..."
aws lambda delete-function \
  --function-name $FUNCTION_NAME \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION || echo "Lambda関数が見つかりません（既に削除済み）"

# 4. IAMロールの削除
echo "🔐 IAMロールを削除中..."
aws iam delete-role \
  --role-name $ROLE_NAME \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION || echo "IAMロールが見つかりません（既に削除済み）"

# 5. ローカルファイルの削除
echo "📁 一時ファイルを削除中..."
cd lambda/ 2>/dev/null || cd ./
rm -f function.zip
rm -rf dist/

echo "✅ クリーンアップ完了!"
echo ""
echo "📋 削除されたリソース:"
echo "   ✓ DynamoDBテーブル: $TABLE_NAME"
echo "   ✓ Lambda関数: $FUNCTION_NAME"
echo "   ✓ API Gateway: $API_NAME"
echo "   ✓ IAMロール: $ROLE_NAME"
echo "   ✓ 一時ファイル (function.zip, dist/)"
echo ""
echo "💡 LocalStack全体をリセットしたい場合は:"
echo "   docker-compose down && docker-compose up -d"