#!/bin/bash

# ========================================
# 初期データ投入スクリプト（在庫データ）
# ========================================

set -e

echo "========================================="
echo "📦 在庫データを投入中..."
echo "========================================="

# 商品1: ノートPC
awslocal dynamodb put-item \
  --table-name inventory \
  --item '{
    "productId": {"S": "prod-001"},
    "productName": {"S": "ノートPC"},
    "stock": {"N": "10"},
    "price": {"N": "120000"},
    "updatedAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"} 
  }'
echo "  ✓ prod-001: ノートPC (在庫: 10, 価格: ¥120,000)"

# 商品2: ワイヤレスマウス
awslocal dynamodb put-item \
  --table-name inventory \
  --item '{
    "productId": {"S": "prod-002"},
    "productName": {"S": "ワイヤレスマウス"},
    "stock": {"N": "50"},
    "price": {"N": "3000"},
    "updatedAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"} 
  }'
echo "  ✓ prod-002: ワイヤレスマウス (在庫: 50, 価格: ¥3,000)"

# 商品3: キーボード
awslocal dynamodb put-item \
  --table-name inventory \
  --item '{
    "productId": {"S": "prod-003"},
    "productName": {"S": "メカニカルキーボード"},
    "stock": {"N": "25"},
    "price": {"N": "15000"},
    "updatedAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"} 
  }'
echo "  ✓ prod-003: メカニカルキーボード (在庫: 25, 価格: ¥15,000)"

# 商品4: モニター
awslocal dynamodb put-item \
  --table-name inventory \
  --item '{
    "productId": {"S": "prod-004"},
    "productName": {"S": "27インチモニター"},
    "stock": {"N": "5"},
    "price": {"N": "45000"},
    "updatedAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"} 
  }'
echo "  ✓ prod-004: 27インチモニター (在庫: 5, 価格: ¥45,000)"

# 商品5: 在庫切れ商品（テスト用）
awslocal dynamodb put-item \
  --table-name inventory \
  --item '{
    "productId": {"S": "prod-005"},
    "productName": {"S": "人気商品（在庫切れ）"},
    "stock": {"N": "0"},
    "price": {"N": "8000"},
    "updatedAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"} 
  }'
echo "  ✓ prod-005: 人気商品（在庫切れ） (在庫: 0, 価格: ¥8,000)"

echo ""
echo "========================================="
echo "📊 在庫データ確認"
echo "========================================="
awslocal dynamodb scan --table-name inventory | jq -r '.Items[] | "  \(.productId.S): \(.productName.S) - 在庫: \(.stock.N)個, ¥\(.price.N)"'

echo ""
echo "✅ 初期データの投入が完了しました！"
