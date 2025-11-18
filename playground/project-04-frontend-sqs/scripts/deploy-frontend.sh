#!/bin/bash

# Phase 6: フロントエンドをS3にデプロイ

set -e

echo "🚀 Deploying frontend to S3..."
echo "================================"
echo ""

BUCKET_NAME="ecommerce-frontend"
# AWS="awslocal"

# 既存のファイルを削除
echo "1️⃣  Cleaning up existing files in S3..."
awslocal s3 rm s3://${BUCKET_NAME} --recursive 2>/dev/null || true

# フロントエンドファイルをS3にアップロード
echo "2️⃣  Uploading frontend files to S3..."
awslocal s3 sync frontend-nextjs/out/ s3://${BUCKET_NAME}/ \
  --exclude ".DS_Store" \
  --exclude "*.map"

# バケットのウェブサイト設定を確認
echo "3️⃣  Verifying bucket website configuration..."
awslocal s3api get-bucket-website --bucket ${BUCKET_NAME} 2>/dev/null || {
  echo "⚠️  Setting up bucket website configuration..."
  awslocal s3api put-bucket-website \
    --bucket ${BUCKET_NAME} \
    --website-configuration '{
      "IndexDocument": {"Suffix": "index.html"},
      "ErrorDocument": {"Key": "index.html"}
    }'
}

# パブリックアクセス設定を確認
echo "4️⃣  Ensuring public read access..."
awslocal s3api put-bucket-policy \
  --bucket ${BUCKET_NAME} \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [{
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::'${BUCKET_NAME}'/*"
    }]
  }'

# デプロイ完了
echo ""
echo "================================"
echo "✅ Frontend deployed successfully!"
echo "================================"
echo ""
echo "📍 Frontend URL:"
echo "   http://${BUCKET_NAME}.s3-website.localhost.localstack.cloud:4566"
echo ""
echo "📍 API Gateway URL (configured in frontend):"
echo "   https://aqcbeyvuwh.execute-api.localhost.localstack.cloud:4566/prod/"
echo ""
