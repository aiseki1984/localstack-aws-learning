#!/bin/bash

# デプロイされたリソースを確認するスクリプト
set -e

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

STACK_NAME="Project03CdkBasicStack"
REGION="ap-northeast-1"
ENDPOINT_URL="http://localstack:4566"

echo "=========================================="
echo "CDK Stack Resources"
echo "=========================================="

# 1. スタックの状態
echo ""
echo "📊 Stack Status:"
aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --endpoint-url=${ENDPOINT_URL} \
  --region=${REGION} \
  --query 'Stacks[0].{Name:StackName,Status:StackStatus,Created:CreationTime}' \
  --output json | jq .

# 2. スタックの出力
echo ""
echo "📤 Stack Outputs:"
aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --endpoint-url=${ENDPOINT_URL} \
  --region=${REGION} \
  --query 'Stacks[0].Outputs' \
  --output json | jq .

# 3. スタックのリソース一覧
echo ""
echo "📦 Stack Resources:"
aws cloudformation list-stack-resources \
  --stack-name ${STACK_NAME} \
  --endpoint-url=${ENDPOINT_URL} \
  --region=${REGION} \
  --query 'StackResourceSummaries[*].{LogicalId:LogicalResourceId,Type:ResourceType,Status:ResourceStatus}' \
  --output json | jq .

# 4. DynamoDB テーブルの詳細
echo ""
echo "🗄️  DynamoDB Table:"
TABLE_NAME=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --endpoint-url=${ENDPOINT_URL} \
  --region=${REGION} \
  --query 'Stacks[0].Outputs[?OutputKey==`TableName`].OutputValue' \
  --output text 2>/dev/null)

if [ -n "${TABLE_NAME}" ] && [ "${TABLE_NAME}" != "None" ]; then
  echo "Table Name: ${TABLE_NAME}"
  if aws dynamodb describe-table \
    --table-name ${TABLE_NAME} \
    --endpoint-url=${ENDPOINT_URL} \
    --region=${REGION} \
    --query 'Table.{Name:TableName,Status:TableStatus,ItemCount:ItemCount,SizeBytes:TableSizeBytes}' \
    --output json 2>/dev/null | jq .; then
    
    echo ""
    echo "Item Count:"
    aws dynamodb scan \
      --table-name ${TABLE_NAME} \
      --endpoint-url=${ENDPOINT_URL} \
      --region=${REGION} \
      --select COUNT \
      --query 'Count' \
      --output text 2>/dev/null || echo "0"
  else
    echo "⚠️  Table not found or not accessible"
  fi
else
  echo "⚠️  No DynamoDB table found in stack outputs"
fi

# 5. Lambda 関数の詳細
echo ""
echo "⚡ Lambda Functions:"
LAMBDA_RESULT=$(aws lambda list-functions \
  --endpoint-url=${ENDPOINT_URL} \
  --region=${REGION} \
  --query 'Functions[?starts_with(FunctionName, `'${STACK_NAME}'`)]' \
  --output json 2>/dev/null | jq '.[] | {Name:.FunctionName,Runtime,Handler,Modified:.LastModified}')

if [ -n "${LAMBDA_RESULT}" ]; then
  echo "${LAMBDA_RESULT}"
else
  echo "⚠️  No Lambda functions found for this stack"
fi

# 6. API Gateway の詳細
echo ""
echo "🌐 API Gateway:"
API_ID=$(aws apigateway get-rest-apis \
  --endpoint-url=${ENDPOINT_URL} \
  --region=${REGION} \
  --query 'items[?name==`Posts Service`].id' \
  --output text 2>/dev/null)

if [ -n "${API_ID}" ] && [ "${API_ID}" != "None" ]; then
  echo "API ID: ${API_ID}"
  echo ""
  echo "API Resources:"
  aws apigateway get-resources \
    --rest-api-id ${API_ID} \
    --endpoint-url=${ENDPOINT_URL} \
    --region=${REGION} \
    --query 'items[*].{Path:path,Methods:resourceMethods}' \
    --output json 2>/dev/null | jq . || echo "⚠️  Unable to fetch API resources"
else
  echo "⚠️  No API Gateway found"
fi

# 7. API URL
echo ""
echo "🔗 API Endpoint:"
API_URL=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --endpoint-url=${ENDPOINT_URL} \
  --region=${REGION} \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text 2>/dev/null)

if [ -n "${API_URL}" ] && [ "${API_URL}" != "None" ]; then
  echo "${API_URL}"
else
  echo "⚠️  No API URL found in stack outputs"
fi

echo ""
echo "=========================================="
echo "✅ Resource check completed!"
echo "=========================================="
