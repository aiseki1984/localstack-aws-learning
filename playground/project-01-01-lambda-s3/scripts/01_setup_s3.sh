#!/bin/bash

# LocalStack S3 Setup Script for Lambda Practice

echo "🚀 Setting up S3 bucket for Lambda practice..."

# S3バケット名
BUCKET_NAME="lambda-s3-practice"

# LocalStack設定
LOCALSTACK_ENDPOINT="http://localstack:4566"
AWS_REGION="us-east-1"

# S3バケット作成
echo "📦 Creating S3 bucket: $BUCKET_NAME"
aws s3 mb s3://$BUCKET_NAME \
  --endpoint-url=$LOCALSTACK_ENDPOINT \
  --region $AWS_REGION

if [ $? -eq 0 ]; then
  echo "✅ S3 bucket created successfully"
else
  echo "❌ Failed to create S3 bucket"
  exit 1
fi

# バケット一覧確認
echo "📋 Current S3 buckets:"
aws s3 ls --endpoint-url=$LOCALSTACK_ENDPOINT --region $AWS_REGION

# テストフォルダ構造を作成（空のオブジェクトで仮想フォルダを作成）
echo "📁 Creating folder structure..."
aws s3api put-object \
  --bucket $BUCKET_NAME \
  --key "javascript-files/" \
  --endpoint-url=$LOCALSTACK_ENDPOINT \
  --region $AWS_REGION

aws s3api put-object \
  --bucket $BUCKET_NAME \
  --key "typescript-files/" \
  --endpoint-url=$LOCALSTACK_ENDPOINT \
  --region $AWS_REGION

aws s3api put-object \
  --bucket $BUCKET_NAME \
  --key "python-files/" \
  --endpoint-url=$LOCALSTACK_ENDPOINT \
  --region $AWS_REGION

aws s3api put-object \
  --bucket $BUCKET_NAME \
  --key "shared/" \
  --endpoint-url=$LOCALSTACK_ENDPOINT \
  --region $AWS_REGION

# config.envファイルを作成（プロジェクトルート）
CONFIG_FILE="./config.env"
echo "📝 Creating config file: $CONFIG_FILE"
cat > $CONFIG_FILE << EOF
# LocalStack Configuration for Lambda S3 Practice
export LOCALSTACK_ENDPOINT="$LOCALSTACK_ENDPOINT"
export S3_BUCKET_NAME="$BUCKET_NAME"
export AWS_REGION="$AWS_REGION"
export LAMBDA_ROLE_ARN="arn:aws:iam::000000000000:role/lambda-s3-practice-role"
EOF

echo "✅ S3 setup completed!"
echo "Bucket name: $BUCKET_NAME"
echo "Endpoint: $LOCALSTACK_ENDPOINT"
echo "Config file created: $CONFIG_FILE"