#!/bin/bash

# Lambda + API Gateway v2 (HTTP API) デプロイメントスクリプト (LocalStack用)

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

# 設定
FUNCTION_NAME="posts-api-lambda"
ROLE_NAME="lambda-api-execution-role"
API_NAME="posts-api"
RUNTIME="nodejs20.x"
HANDLER="index.handler"

echo "🚀 Lambda + API Gateway v2 (HTTP API) デプロイメント開始"
echo "📋 設定:"
echo "   Function: $FUNCTION_NAME"
echo "   API: $API_NAME"
echo "   Runtime: $RUNTIME"
echo "   Region: $AWS_REGION"
echo "   Endpoint: $AWS_ENDPOINT_URL"

# 1. IAMロールの作成
echo "🔐 IAMロールを作成中..."
aws iam create-role \
  --role-name $ROLE_NAME \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {"Service": "lambda.amazonaws.com"},
        "Action": "sts:AssumeRole"
      }
    ]
  }' \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION || echo "ロールは既に存在します"

# IAMロールのARNを設定
LAMBDA_ROLE_ARN="arn:aws:iam::000000000000:role/$ROLE_NAME"

# 2. TypeScriptのビルド
echo "🔨 TypeScriptをビルド中..."
cd lambda/

echo "📦 Installing dependencies..."
npm install

echo "🔨 Compiling TypeScript..."
npm run build

if [ ! -f "dist/index.js" ]; then
  echo "❌ TypeScript compilation failed - index.js not found"
  exit 1
fi

# 3. デプロイメントパッケージの作成
echo "📦 デプロイメントパッケージを作成中..."
rm -f function.zip
cd dist/
zip -r ../function.zip . -x "*.git*"
cd ../../

# 4. Lambda関数の削除（既存があれば）
echo "🗑️ 既存Lambda関数を削除中..."
aws lambda delete-function \
  --function-name $FUNCTION_NAME \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION 2>/dev/null || true

# 5. Lambda関数の作成
echo "⚡ Lambda関数をデプロイ中..."
aws lambda create-function \
  --function-name $FUNCTION_NAME \
  --runtime $RUNTIME \
  --role $LAMBDA_ROLE_ARN \
  --handler $HANDLER \
  --zip-file fileb://lambda/function.zip \
  --timeout 30 \
  --memory-size 256 \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION

if [ $? -ne 0 ]; then
  echo "❌ Lambda関数の作成に失敗しました"
  exit 1
fi

# Lambda関数の準備完了を待つ
echo "⏳ Lambda関数の準備完了を待機中..."
sleep 5

# 6. API Gateway v2 (HTTP API) の作成
echo "🌐 API Gateway v2 (HTTP API) を作成中..."

# 既存APIの削除
echo "🗑️ 既存APIを削除中..."
API_ID=$(aws apigatewayv2 get-apis \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION \
  --query "Items[?Name=='$API_NAME'].ApiId | [0]" \
  --output text 2>/dev/null || echo "")

if [ "$API_ID" != "None" ] && [ "$API_ID" != "" ]; then
  aws apigatewayv2 delete-api \
    --api-id $API_ID \
    --endpoint-url=$AWS_ENDPOINT_URL \
    --region $AWS_REGION || true
fi

# 新しいAPI (HTTP API) の作成
API_CREATE_OUTPUT=$(aws apigatewayv2 create-api \
  --name "$API_NAME" \
  --protocol-type HTTP \
  --description "Posts CRUD API (HTTP API)" \
  --route-selection-expression '$request.method $request.path' \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION \
  --output json)

API_ID=$(echo "$API_CREATE_OUTPUT" | grep -o '"ApiId":"[^"]*"' | cut -d'"' -f4)
API_ENDPOINT_URL=$(echo "$API_CREATE_OUTPUT" | grep -o '"ApiEndpoint":"[^"]*"' | cut -d'"' -f4)

echo "📋 API ID: $API_ID"
echo "📋 API Endpoint: $API_ENDPOINT_URL"

# 7. Lambda統合の作成
echo "� Lambda統合を作成中..."
INTEGRATION_OUTPUT=$(aws apigatewayv2 create-integration \
  --api-id $API_ID \
  --integration-type AWS_PROXY \
  --integration-uri "arn:aws:lambda:$AWS_REGION:000000000000:function:$FUNCTION_NAME" \
  --payload-format-version "2.0" \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION \
  --output json)

INTEGRATION_ID=$(echo "$INTEGRATION_OUTPUT" | grep -o '"IntegrationId":"[^"]*"' | cut -d'"' -f4)
echo "📋 Integration ID: $INTEGRATION_ID"

# 8. ルートの作成
echo "�️ ルートを作成中..."

# /posts ルート
aws apigatewayv2 create-route \
  --api-id $API_ID \
  --route-key "GET /posts" \
  --target "integrations/$INTEGRATION_ID" \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION

aws apigatewayv2 create-route \
  --api-id $API_ID \
  --route-key "POST /posts" \
  --target "integrations/$INTEGRATION_ID" \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION

aws apigatewayv2 create-route \
  --api-id $API_ID \
  --route-key "OPTIONS /posts" \
  --target "integrations/$INTEGRATION_ID" \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION

# /posts/{id} ルート
aws apigatewayv2 create-route \
  --api-id $API_ID \
  --route-key "GET /posts/{id}" \
  --target "integrations/$INTEGRATION_ID" \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION

aws apigatewayv2 create-route \
  --api-id $API_ID \
  --route-key "PUT /posts/{id}" \
  --target "integrations/$INTEGRATION_ID" \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION

aws apigatewayv2 create-route \
  --api-id $API_ID \
  --route-key "DELETE /posts/{id}" \
  --target "integrations/$INTEGRATION_ID" \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION

aws apigatewayv2 create-route \
  --api-id $API_ID \
  --route-key "OPTIONS /posts/{id}" \
  --target "integrations/$INTEGRATION_ID" \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION

# 9. ステージの作成とデプロイ
echo "🚀 ステージを作成してデプロイ中..."
aws apigatewayv2 create-stage \
  --api-id $API_ID \
  --stage-name "dev" \
  --auto-deploy \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION

# 10. Lambda関数の実行権限をAPI Gateway v2に付与
echo "🔐 API Gateway v2にLambda実行権限を付与中..."
aws lambda add-permission \
  --function-name $FUNCTION_NAME \
  --statement-id "allow-api-gateway-v2" \
  --action "lambda:InvokeFunction" \
  --principal "apigateway.amazonaws.com" \
  --source-arn "arn:aws:execute-api:$AWS_REGION:000000000000:$API_ID/*/*" \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION || echo "権限は既に存在します"

echo "✅ デプロイメント完了!"
echo ""
echo "📋 デプロイされたリソース:"
echo "   ✓ Lambda関数: $FUNCTION_NAME"
echo "   ✓ IAMロール: $ROLE_NAME"
echo "   ✓ API Gateway v2 (HTTP API): $API_NAME (ID: $API_ID)"
echo ""
echo "🌐 API エンドポイント:"
echo "   Base URL: $API_ENDPOINT_URL/dev"
echo ""
echo "🧪 テストコマンド例:"
echo "   GET Posts:    curl $API_ENDPOINT_URL/dev/posts"
echo "   GET Post:     curl $API_ENDPOINT_URL/dev/posts/1"
echo "   POST Post:    curl -X POST $API_ENDPOINT_URL/dev/posts -H 'Content-Type: application/json' -d '{\"title\":\"New Post\",\"content\":\"Content here\",\"author\":\"Test Author\"}'"
echo "   PUT Post:     curl -X PUT $API_ENDPOINT_URL/dev/posts/1 -H 'Content-Type: application/json' -d '{\"title\":\"Updated Title\"}'"
echo "   DELETE Post:  curl -X DELETE $API_ENDPOINT_URL/dev/posts/1"