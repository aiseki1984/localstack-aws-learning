#!/bin/bash

# ========================================
# Order Processor API テストスクリプト
# ========================================

set -e

# API エンドポイントを取得
API_ENDPOINT=$(awslocal cloudformation describe-stacks \
  --stack-name Project03Cdk03Stack \
  --query 'Stacks[0].Outputs[?OutputKey==`OrdersEndpoint`].OutputValue' \
  --output text)

echo "========================================="
echo "🧪 Order Processor API テスト"
echo "========================================="
echo "API Endpoint: $API_ENDPOINT"
echo ""

# テスト1: 正常な注文
echo "📝 テスト1: 正常な注文（ノートPC 1台）"
echo "========================================="

RESPONSE=$(curl -s -X POST "$API_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-001",
    "customerEmail": "user@example.com",
    "items": [
      {
        "productId": "prod-001",
        "productName": "ノートPC",
        "quantity": 1,
        "price": 120000
      }
    ]
  }')

echo "$RESPONSE" | jq '.'
ORDER_ID=$(echo "$RESPONSE" | jq -r '.orderId')
echo ""
echo "✅ 注文ID: $ORDER_ID"
echo ""

# 少し待機（非同期処理のため）
echo "⏳ 非同期処理を待機中（3秒）..."
sleep 3
echo ""

# DynamoDBで注文を確認（scanで全件から該当IDを検索）
echo "📊 DynamoDBで注文を確認"
echo "========================================="
awslocal dynamodb scan \
  --table-name orders \
  --filter-expression "orderId = :oid" \
  --expression-attribute-values "{\":oid\": {\"S\": \"$ORDER_ID\"}}" \
  | jq '.Items[0] | {
    orderId: .orderId.S,
    customerId: .customerId.S,
    status: .status.S,
    totalAmount: .totalAmount.N,
    createdAt: .createdAt.S,
    itemCount: (.items.L | length)
  }'
echo ""

# SQSキューにメッセージが届いているか確認
echo "📬 SQSキューのメッセージ数を確認"
echo "========================================="

INVENTORY_QUEUE=$(awslocal sqs get-queue-url --queue-name inventory-queue --query 'QueueUrl' --output text)
NOTIFICATION_QUEUE=$(awslocal sqs get-queue-url --queue-name notification-queue --query 'QueueUrl' --output text)
BILLING_QUEUE=$(awslocal sqs get-queue-url --queue-name billing-queue --query 'QueueUrl' --output text)

INV_COUNT=$(awslocal sqs get-queue-attributes --queue-url "$INVENTORY_QUEUE" --attribute-names ApproximateNumberOfMessages --query 'Attributes.ApproximateNumberOfMessages' --output text)
NOT_COUNT=$(awslocal sqs get-queue-attributes --queue-url "$NOTIFICATION_QUEUE" --attribute-names ApproximateNumberOfMessages --query 'Attributes.ApproximateNumberOfMessages' --output text)
BILL_COUNT=$(awslocal sqs get-queue-attributes --queue-url "$BILLING_QUEUE" --attribute-names ApproximateNumberOfMessages --query 'Attributes.ApproximateNumberOfMessages' --output text)

echo "  ✓ Inventory Queue: $INV_COUNT メッセージ"
echo "  ✓ Notification Queue: $NOT_COUNT メッセージ"
echo "  ✓ Billing Queue: $BILL_COUNT メッセージ"
echo ""

# メッセージの内容を確認（1つだけ）
echo "📨 Inventory Queueのメッセージ内容"
echo "========================================="
MESSAGE=$(awslocal sqs receive-message --queue-url "$INVENTORY_QUEUE" --max-number-of-messages 1)
if [ "$(echo "$MESSAGE" | jq '.Messages | length')" -gt 0 ]; then
  echo "$MESSAGE" | jq -r '.Messages[0].Body' | jq '.'
  
  # メッセージを削除（再受信しないように）
  RECEIPT_HANDLE=$(echo "$MESSAGE" | jq -r '.Messages[0].ReceiptHandle')
  awslocal sqs delete-message --queue-url "$INVENTORY_QUEUE" --receipt-handle "$RECEIPT_HANDLE"
else
  echo "  ⚠️  メッセージが見つかりません（既に処理された可能性があります）"
fi
echo ""

echo "========================================="
echo "✅ テスト完了！"
echo "========================================="
echo ""
echo "💡 次のステップ:"
echo "  - Phase 3でマイクロサービスLambdaを実装"
echo "  - 各キューのメッセージを自動処理"
echo ""
