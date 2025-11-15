#!/bin/bash

# スタックとリソースを削除するスクリプト
set -e

STACK_NAME="Project03CdkBasicStack"
BUCKET_NAME="cdk-lambda-deployment-bucket"
REGION="ap-northeast-1"
ENDPOINT_URL="http://localstack:4566"

echo "=========================================="
echo "Cleaning up CDK Stack"
echo "=========================================="

# 1. CloudFormation スタックの削除
echo ""
echo "🗑️  Deleting CloudFormation stack..."
aws cloudformation delete-stack \
  --stack-name ${STACK_NAME} \
  --endpoint-url=${ENDPOINT_URL} \
  --region=${REGION}

echo "Waiting for stack deletion..."
aws cloudformation wait stack-delete-complete \
  --stack-name ${STACK_NAME} \
  --endpoint-url=${ENDPOINT_URL} \
  --region=${REGION} || echo "Stack deleted or does not exist"

# 2. S3 バケットの削除
echo ""
echo "🗑️  Deleting S3 bucket..."
aws s3 rb s3://${BUCKET_NAME} --force \
  --endpoint-url=${ENDPOINT_URL} \
  --region=${REGION} 2>/dev/null || echo "Bucket does not exist"

echo ""
echo "✅ Cleanup completed!"
