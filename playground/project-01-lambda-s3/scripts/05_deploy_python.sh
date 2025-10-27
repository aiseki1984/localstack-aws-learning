#!/bin/bash

# Python Lambda Function Deployment Script

echo "🚀 Deploying Python Lambda function..."

# 設定読み込み
source ../config.env

FUNCTION_NAME="s3-practice-python"
HANDLER="lambda_function.lambda_handler"
RUNTIME="python3.9"

# Python ディレクトリに移動
cd ../python

echo "📄 Creating deployment package..."
zip -r lambda-deployment.zip . -x "*.git*" "test-files/*"

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
  echo "✅ Python Lambda function deployed successfully!"
  
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
  echo "❌ Failed to deploy Python Lambda function"
  exit 1
fi

# クリーンアップ
rm -f lambda-deployment.zip response.json

echo "🎉 Python deployment completed!"