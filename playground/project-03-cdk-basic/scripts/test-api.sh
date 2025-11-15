#!/bin/bash

# API をテストするスクリプト
set -e

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

STACK_NAME="Project03CdkBasicStack"
REGION="ap-northeast-1"
ENDPOINT_URL="http://localstack:4566"

# API ID を取得
API_ID=$(aws apigateway get-rest-apis \
  --endpoint-url=${ENDPOINT_URL} \
  --region=${REGION} \
  --query 'items[?name==`Posts Service`].id' \
  --output text)

# LocalStack の API URL 形式
BASE_URL="http://localstack:4566/restapis/${API_ID}/prod/_user_request_"

echo "=========================================="
echo "Testing API: ${BASE_URL}"
echo "API ID: ${API_ID}"
echo "=========================================="

# 1. 投稿を作成
echo ""
echo "📝 Test 1: Creating a post (POST /posts)..."
POST_RESPONSE=$(curl -s -X POST "${BASE_URL}/posts" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Post",
    "content": "This is the content of my first post!"
  }')
echo "Response: ${POST_RESPONSE}"
POST_ID=$(echo ${POST_RESPONSE} | jq -r '.id // "test-id-123"')
echo "Created Post ID: ${POST_ID}"

# 2. 全ての投稿を取得
echo ""
echo "📋 Test 2: Getting all posts (GET /posts)..."
curl -s -X GET "${BASE_URL}/posts" -H "Content-Type: application/json" | jq .

# 3. 特定の投稿を取得
echo ""
echo "🔍 Test 3: Getting specific post (GET /posts/${POST_ID})..."
curl -s -X GET "${BASE_URL}/posts/${POST_ID}" -H "Content-Type: application/json" | jq .

# 4. 投稿を更新
echo ""
echo "✏️  Test 4: Updating post (PUT /posts/${POST_ID})..."
curl -s -X PUT "${BASE_URL}/posts/${POST_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "content": "Updated content!"
  }' | jq .

# 5. 投稿を削除
echo ""
echo "🗑️  Test 5: Deleting post (DELETE /posts/${POST_ID})..."
curl -s -X DELETE "${BASE_URL}/posts/${POST_ID}" -H "Content-Type: application/json" | jq .

echo ""
echo "✅ All tests completed!"
