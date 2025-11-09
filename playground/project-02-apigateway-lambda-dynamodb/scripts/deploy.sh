#!/bin/bash

# Lambda + API Gateway デプロイメントスクリプト (LocalStack用)

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
TABLE_NAME="posts-table"
RUNTIME="nodejs20.x"
HANDLER="index.handler"

echo "🚀 Lambda + API Gateway + DynamoDB デプロイメント開始"
echo "📋 設定:"
echo "   Function: $FUNCTION_NAME"
echo "   API: $API_NAME"
echo "   Table: $TABLE_NAME"
echo "   Runtime: $RUNTIME"
echo "   Region: $AWS_REGION"
echo "   Endpoint: $AWS_ENDPOINT_URL"

# 1. DynamoDBテーブルの作成
echo "🗄️  DynamoDBテーブルを作成中..."
aws dynamodb create-table \
  --table-name $TABLE_NAME \
  --attribute-definitions \
      AttributeName=id,AttributeType=S \
  --key-schema \
      AttributeName=id,KeyType=HASH \
  --provisioned-throughput \
      ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION 2>/dev/null || echo "テーブルは既に存在します"

echo "⏳ テーブルの準備完了を待機中..."
sleep 2

# 2. IAMロールの作成
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
  --environment "Variables={TABLE_NAME=$TABLE_NAME,AWS_ENDPOINT_URL=$AWS_ENDPOINT_URL}" \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION

if [ $? -ne 0 ]; then
  echo "❌ Lambda関数の作成に失敗しました"
  exit 1
fi

# Lambda関数の準備完了を待つ
echo "⏳ Lambda関数の準備完了を待機中..."
sleep 5

# 6. API Gatewayの作成
echo "🌐 API Gatewayを作成中..."

# 既存APIの削除
echo "🗑️ 既存APIを削除中..."
API_ID=$(aws apigateway get-rest-apis \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION \
  --query "items[?name=='$API_NAME'].id | [0]" \
  --output text 2>/dev/null || echo "")

if [ "$API_ID" != "None" ] && [ "$API_ID" != "" ]; then
  aws apigateway delete-rest-api \
    --rest-api-id $API_ID \
    --endpoint-url=$AWS_ENDPOINT_URL \
    --region $AWS_REGION || true
fi

# 新しいAPIの作成
API_ID=$(aws apigateway create-rest-api \
  --name $API_NAME \
  --description "Posts CRUD API" \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION \
  --query 'id' \
  --output text)

echo "📋 API ID: $API_ID"

# ルートリソースIDを取得
ROOT_RESOURCE_ID=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION \
  --query 'items[?path==`/`].id | [0]' \
  --output text)

echo "📋 Root Resource ID: $ROOT_RESOURCE_ID"

# 7. /posts リソースの作成
echo "📁 /posts リソースを作成中..."
POSTS_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_RESOURCE_ID \
  --path-part "posts" \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION \
  --query 'id' \
  --output text)

echo "📋 Posts Resource ID: $POSTS_RESOURCE_ID"

# 8. /posts/{id} リソースの作成
echo "📁 /posts/{id} リソースを作成中..."
POSTS_ID_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $POSTS_RESOURCE_ID \
  --path-part "{id}" \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION \
  --query 'id' \
  --output text)

echo "📋 Posts ID Resource ID: $POSTS_ID_RESOURCE_ID"

# 9. メソッドの作成とLambda統合
create_method_and_integration() {
  local RESOURCE_ID=$1
  local HTTP_METHOD=$2
  local RESOURCE_PATH=$3
  
  echo "🔗 $HTTP_METHOD $RESOURCE_PATH メソッドを作成中..."
  
  # メソッドの作成
  aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method $HTTP_METHOD \
    --authorization-type "NONE" \
    --endpoint-url=$AWS_ENDPOINT_URL \
    --region $AWS_REGION

  # Lambda統合の作成
  aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method $HTTP_METHOD \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:$AWS_REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$AWS_REGION:000000000000:function:$FUNCTION_NAME/invocations" \
    --endpoint-url=$AWS_ENDPOINT_URL \
    --region $AWS_REGION
}

# /posts のメソッド作成
create_method_and_integration $POSTS_RESOURCE_ID "GET" "/posts"
create_method_and_integration $POSTS_RESOURCE_ID "POST" "/posts"
create_method_and_integration $POSTS_RESOURCE_ID "OPTIONS" "/posts"

# /posts/{id} のメソッド作成
create_method_and_integration $POSTS_ID_RESOURCE_ID "GET" "/posts/{id}"
create_method_and_integration $POSTS_ID_RESOURCE_ID "PUT" "/posts/{id}"
create_method_and_integration $POSTS_ID_RESOURCE_ID "DELETE" "/posts/{id}"
create_method_and_integration $POSTS_ID_RESOURCE_ID "OPTIONS" "/posts/{id}"

# 10. API Gatewayのデプロイ
echo "🚀 API Gatewayをデプロイ中..."
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name "dev" \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION

# 11. Lambda関数の実行権限をAPI Gatewayに付与
echo "🔐 API GatewayにLambda実行権限を付与中..."
aws lambda add-permission \
  --function-name $FUNCTION_NAME \
  --statement-id "allow-api-gateway" \
  --action "lambda:InvokeFunction" \
  --principal "apigateway.amazonaws.com" \
  --source-arn "arn:aws:execute-api:$AWS_REGION:000000000000:$API_ID/*/*" \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION || echo "権限は既に存在します"

echo "✅ デプロイメント完了!"
echo ""
echo "📋 デプロイされたリソース:"
echo "   ✓ DynamoDB テーブル: $TABLE_NAME"
echo "   ✓ Lambda関数: $FUNCTION_NAME"
echo "   ✓ IAMロール: $ROLE_NAME"
echo "   ✓ API Gateway: $API_NAME (ID: $API_ID)"
echo ""
echo "🌐 API エンドポイント:"
API_ENDPOINT="$AWS_ENDPOINT_URL/restapis/$API_ID/dev/_user_request_"
echo "   Base URL: $API_ENDPOINT"
echo ""
echo "🧪 テストコマンド例:"
echo "   GET Posts:    curl $API_ENDPOINT/posts"
echo "   GET Post:     curl $API_ENDPOINT/posts/1"
echo "   POST Post:    curl -X POST $API_ENDPOINT/posts -H 'Content-Type: application/json' -d '{\"title\":\"New Post\",\"content\":\"Content here\",\"author\":\"Test Author\"}'"
echo "   PUT Post:     curl -X PUT $API_ENDPOINT/posts/1 -H 'Content-Type: application/json' -d '{\"title\":\"Updated Title\"}'"
echo "   DELETE Post:  curl -X DELETE $API_ENDPOINT/posts/1"