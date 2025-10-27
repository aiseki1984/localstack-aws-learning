#!/bin/bash

# TypeScript Lambda Function Deployment Script

echo "🚀 Deploying TypeScript Lambda function..."

# 設定読み込み
source ../config.env

FUNCTION_NAME="s3-practice-ts"
HANDLER="index.handler"
RUNTIME="nodejs18.x"

# TypeScript ディレクトリに移動
cd ../typescript

echo "📦 Installing dependencies..."
npm install

echo "🔨 Compiling TypeScript..."
npm run build

if [ ! -f "dist/index.js" ]; then
  echo "❌ TypeScript compilation failed - index.js not found"
  exit 1
fi

echo "📄 Creating deployment package..."
# distディレクトリとnode_modulesを含める
cp -r node_modules dist/
cd dist
zip -r ../lambda-deployment.zip . -x "*.git*"
cd ..

echo "🚀 Deploying Lambda function: $FUNCTION_NAME"

# 既存の関数があれば削除
aws lambda delete-function \
  --function-name $FUNCTION_NAME \
  --endpoint-url=$LOCALSTACK_ENDPOINT \
  --region $AWS_REGION 2>/dev/null || true

# Lambda関数の作成
aws lambda create-function \
  --function-name $FUNCTION_NAME \
  --runtime $RUNTIME \
  --role $LAMBDA_ROLE_ARN \
  --handler $HANDLER \
  --zip-file fileb://lambda-deployment.zip \
  --timeout 30 \
  --memory-size 256 \
  --environment Variables="{LOCALSTACK_ENDPOINT=$LOCALSTACK_ENDPOINT,S3_BUCKET_NAME=$S3_BUCKET_NAME,AWS_REGION=$AWS_REGION}" \
  --endpoint-url=$LOCALSTACK_ENDPOINT \
  --region $AWS_REGION

if [ $? -eq 0 ]; then
  echo "✅ TypeScript Lambda function deployed successfully!"
  
  # テスト実行
  echo "🧪 Running basic test..."
  PAYLOAD=$(echo '{"action": "test"}' | base64 | tr -d '\n')
  aws lambda invoke \
    --function-name $FUNCTION_NAME \
    --payload $PAYLOAD \
    response.json \
    --endpoint-url=$LOCALSTACK_ENDPOINT \
    --region $AWS_REGION
  
  echo "📄 Test response:"
  cat response.json | jq -r '.body' | jq .
  
else
  echo "❌ Failed to deploy TypeScript Lambda function"
  exit 1
fi

# クリーンアップ
rm -f lambda-deployment.zip response.json

echo "🎉 TypeScript deployment completed!"