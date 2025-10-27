#!/bin/bash

# IAM Role Setup for Lambda Functions

echo "🔐 Setting up IAM role for Lambda functions..."

# LocalStack設定
LOCALSTACK_ENDPOINT="http://localstack:4566"
AWS_REGION="us-east-1"
ROLE_NAME="lambda-s3-practice-role"

# Trust Policy Document
TRUST_POLICY='{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}'

# S3 Access Policy Document
S3_POLICY='{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:GetObjectMetadata",
        "s3:PutObjectMetadata"
      ],
      "Resource": [
        "arn:aws:s3:::lambda-s3-practice",
        "arn:aws:s3:::lambda-s3-practice/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}'

# IAMロール作成
echo "📋 Creating IAM role: $ROLE_NAME"
aws iam create-role \
  --role-name $ROLE_NAME \
  --assume-role-policy-document "$TRUST_POLICY" \
  --endpoint-url=$LOCALSTACK_ENDPOINT \
  --region $AWS_REGION

# S3アクセスポリシーをアタッチ
echo "🔗 Attaching S3 access policy..."
aws iam put-role-policy \
  --role-name $ROLE_NAME \
  --policy-name "S3AccessPolicy" \
  --policy-document "$S3_POLICY" \
  --endpoint-url=$LOCALSTACK_ENDPOINT \
  --region $AWS_REGION

# ロール情報を確認
echo "✅ IAM role setup completed!"
echo "Role ARN: arn:aws:iam::000000000000:role/$ROLE_NAME"

# 設定を環境変数ファイルに保存
cat > ../config.env << EOF
# Lambda S3 Practice Configuration
export LAMBDA_ROLE_ARN="arn:aws:iam::000000000000:role/$ROLE_NAME"
export S3_BUCKET_NAME="lambda-s3-practice"
export LOCALSTACK_ENDPOINT="http://localstack:4566"
export AWS_REGION="us-east-1"
EOF

echo "📄 Configuration saved to config.env"