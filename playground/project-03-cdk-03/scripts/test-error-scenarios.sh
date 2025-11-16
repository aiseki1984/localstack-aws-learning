#!/bin/bash

# ========================================
# Phase 4: エラーシナリオテスト
# ========================================

set -e

API_ENDPOINT=$(awslocal cloudformation describe-stacks \
  --stack-name Project03Cdk03Stack \
  --query 'Stacks[0].Outputs[?OutputKey==`OrdersEndpoint`].OutputValue' \
  --output text)

DLQ_URL="http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/order-processing-dlq"

echo "========================================="
echo "🧪 Phase 4: エラーシナリオテスト"
echo "========================================="
echo ""

# ========================================
# テスト1: 在庫不足エラー
# ========================================
echo "❌ テスト1: 在庫不足エラー（在庫切れ商品を注文）"
echo "========================================="

RESPONSE=$(curl -s -X POST "$API_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-002",
    "customerEmail": "error-test@example.com",
    "items": [
      {
        "productId": "prod-005",
        "productName": "人気商品（在庫切れ）",
        "quantity": 1,
        "price": 8000
      }
    ]
  }')

echo "$RESPONSE" | jq '.'
ORDER_ID=$(echo "$RESPONSE" | jq -r '.orderId')
echo ""
echo "📝 注文ID: $ORDER_ID"
echo "⏳ Inventory Serviceの処理とリトライを待機（15秒）..."
sleep 15
echo ""

# Inventory Queueのメッセージ数確認
INV_QUEUE_URL="http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/inventory-queue"
INV_MESSAGES=$(awslocal sqs get-queue-attributes \
  --queue-url "$INV_QUEUE_URL" \
  --attribute-names ApproximateNumberOfMessages \
  --query 'Attributes.ApproximateNumberOfMessages' \
  --output text)

echo "📦 Inventory Queue: $INV_MESSAGES メッセージ"

# DLQのメッセージ数確認
DLQ_MESSAGES=$(awslocal sqs get-queue-attributes \
  --queue-url "$DLQ_URL" \
  --attribute-names ApproximateNumberOfMessages \
  --query 'Attributes.ApproximateNumberOfMessages' \
  --output text)

echo "🗑️  DLQ: $DLQ_MESSAGES メッセージ"
echo ""

if [ "$DLQ_MESSAGES" -gt 0 ]; then
  echo "✅ DLQにメッセージが転送されました（エラーハンドリング成功）"
  echo ""
  echo "📨 DLQメッセージ内容:"
  echo "========================================="
  awslocal sqs receive-message \
    --queue-url "$DLQ_URL" \
    --max-number-of-messages 1 \
    | jq -r '.Messages[0].Body' | jq '.'
  echo ""
else
  echo "⚠️  まだDLQに転送されていません（リトライ中の可能性）"
  echo ""
fi

# Notification/Billing Serviceは成功しているか確認
echo "📧 Notification Service（成功するはず）:"
NOT_COUNT=$(awslocal dynamodb scan --table-name notifications --select "COUNT" | jq '.Count')
echo "  通知レコード数: $NOT_COUNT 件"
echo ""

echo "💳 Billing Service（成功するはず）:"
BILL_COUNT=$(awslocal dynamodb scan --table-name billing --select "COUNT" | jq '.Count')
echo "  請求レコード数: $BILL_COUNT 件"
echo ""

# ========================================
# テスト2: 過剰な在庫要求
# ========================================
echo "❌ テスト2: 過剰な在庫要求（在庫以上の数量）"
echo "========================================="

RESPONSE=$(curl -s -X POST "$API_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-003",
    "customerEmail": "overstock@example.com",
    "items": [
      {
        "productId": "prod-004",
        "productName": "27インチモニター",
        "quantity": 100,
        "price": 45000
      }
    ]
  }')

echo "$RESPONSE" | jq '.'
ORDER_ID2=$(echo "$RESPONSE" | jq -r '.orderId')
echo ""
echo "📝 注文ID: $ORDER_ID2"
echo "⏳ 処理とリトライを待機（15秒）..."
sleep 15
echo ""

DLQ_MESSAGES_AFTER=$(awslocal sqs get-queue-attributes \
  --queue-url "$DLQ_URL" \
  --attribute-names ApproximateNumberOfMessages \
  --query 'Attributes.ApproximateNumberOfMessages' \
  --output text)

echo "🗑️  DLQ: $DLQ_MESSAGES_AFTER メッセージ"
echo ""

if [ "$DLQ_MESSAGES_AFTER" -gt "$DLQ_MESSAGES" ]; then
  echo "✅ 新しいエラーメッセージがDLQに追加されました"
else
  echo "⚠️  まだDLQに転送されていません（リトライ中）"
fi
echo ""

# ========================================
# まとめ
# ========================================
echo "========================================="
echo "📊 テスト結果サマリー"
echo "========================================="

# Lambda エラーログを確認
echo ""
echo "📜 Inventory Service エラーログ（最新5件）:"
echo "-----------------------------------------"
awslocal logs tail /aws/lambda/inventory-service --since 2m --format short 2>/dev/null \
  | grep -i "error\|insufficient\|not found" | tail -n 5 || echo "  （エラーログなし）"

echo ""
echo "========================================="
echo "✅ Phase 4 エラーシナリオテスト完了"
echo "========================================="
echo ""
echo "💡 確認ポイント:"
echo "  ✓ 在庫不足の注文 → Inventory Serviceで3回リトライ → DLQ転送"
echo "  ✓ Notification/Billing Serviceは正常動作（サービス分離）"
echo "  ✓ DLQに失敗メッセージが記録される"
echo "  ✓ 他のサービスに影響を与えない"
echo ""
