#!/bin/bash

# JavaScript Lambda Function Deployment Script

echo "🚀 Deploying JavaScript Lambda function..."

# 設定読み込み
source config.env

FUNCTION_NAME="s3-practice-js"
HANDLER="index.handler"
RUNTIME="nodejs18.x"

# JavaScript ディレクトリに移動
cd javascript

echo "📦 Installing dependencies..."
npm install

echo "📄 Creating deployment package..."
zip -r lambda-deployment.zip . -x "*.git*" "test-files/*"

echo "🚀 Deploying Lambda function: $FUNCTION_NAME"

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
  echo "✅ JavaScript Lambda function deployed successfully!"
  
  # テスト実行
  echo "🧪 Running basic test..."
  aws lambda invoke \
    --function-name $FUNCTION_NAME \
    --payload '{"action": "test"}' \
    response.json \
    --endpoint-url=$LOCALSTACK_ENDPOINT \
    --region $AWS_REGION
  
  echo "📄 Test response:"
  cat response.json | jq .
  
else
  echo "❌ Failed to deploy JavaScript Lambda function"
  exit 1
fi

# クリーンアップ
rm -f lambda-deployment.zip response.json

echo "🎉 JavaScript deployment completed!"