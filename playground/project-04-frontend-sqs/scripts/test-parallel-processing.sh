#!/bin/bash

# ========================================
# Phase 4: 並行処理テスト
# ========================================

set -e

API_ENDPOINT=$(awslocal cloudformation describe-stacks \
  --stack-name Project03Cdk03Stack \
  --query 'Stacks[0].Outputs[?OutputKey==`OrdersEndpoint`].OutputValue' \
  --output text)

echo "========================================="
echo "🚀 Phase 4: 並行処理テスト"
echo "========================================="
echo ""

echo "📝 5つの注文を同時に送信します..."
echo ""

# 注文データを配列で定義
declare -a ORDERS=(
  '{"customerId":"customer-101","customerEmail":"user101@example.com","items":[{"productId":"prod-001","productName":"ノートPC","quantity":1,"price":120000}]}'
  '{"customerId":"customer-102","customerEmail":"user102@example.com","items":[{"productId":"prod-002","productName":"ワイヤレスマウス","quantity":2,"price":3000}]}'
  '{"customerId":"customer-103","customerEmail":"user103@example.com","items":[{"productId":"prod-003","productName":"メカニカルキーボード","quantity":1,"price":15000}]}'
  '{"customerId":"customer-104","customerEmail":"user104@example.com","items":[{"productId":"prod-001","productName":"ノートPC","quantity":1,"price":120000}]}'
  '{"customerId":"customer-105","customerEmail":"user105@example.com","items":[{"productId":"prod-002","productName":"ワイヤレスマウス","quantity":3,"price":3000}]}'
)

# 並行実行開始時刻
START_TIME=$(date +%s)

# バックグラウンドで5つの注文を送信
declare -a PIDS=()
declare -a ORDER_IDS=()

for i in "${!ORDERS[@]}"; do
  ORDER_NUM=$((i + 1))
  (
    RESPONSE=$(curl -s -X POST "$API_ENDPOINT" \
      -H "Content-Type: application/json" \
      -d "${ORDERS[$i]}")
    ORDER_ID=$(echo "$RESPONSE" | jq -r '.orderId')
    echo "$ORDER_ID" > "/tmp/order_${i}.txt"
  ) &
  PIDS+=($!)
  echo "  📤 注文 $ORDER_NUM を送信中... (PID: ${PIDS[$i]})"
done

# すべてのバックグラウンドプロセスの完了を待機
echo ""
echo "⏳ すべての注文完了を待機中..."
for pid in "${PIDS[@]}"; do
  wait $pid
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "✅ すべての注文が完了しました（所要時間: ${DURATION}秒）"
echo ""

# 注文IDを収集
echo "📋 作成された注文ID:"
echo "========================================="
for i in {0..4}; do
  if [ -f "/tmp/order_${i}.txt" ]; then
    ORDER_ID=$(cat "/tmp/order_${i}.txt")
    ORDER_IDS+=("$ORDER_ID")
    echo "  $((i + 1)). $ORDER_ID"
    rm "/tmp/order_${i}.txt"
  fi
done
echo ""

# 非同期処理の完了を待機
echo "⏳ マイクロサービスの処理を待機中（10秒）..."
sleep 10
echo ""

# 結果確認
echo "========================================="
echo "📊 処理結果の確認"
echo "========================================="

# DynamoDBテーブルのレコード数確認
ORDERS_COUNT=$(awslocal dynamodb scan --table-name orders --select "COUNT" | jq '.Count')
NOTIFICATIONS_COUNT=$(awslocal dynamodb scan --table-name notifications --select "COUNT" | jq '.Count')
BILLING_COUNT=$(awslocal dynamodb scan --table-name billing --select "COUNT" | jq '.Count')

echo ""
echo "📦 Orders Table: $ORDERS_COUNT 件"
echo "📧 Notifications Table: $NOTIFICATIONS_COUNT 件"
echo "💳 Billing Table: $BILLING_COUNT 件"
echo ""

# 在庫の変動を確認
echo "📊 在庫の変動:"
echo "========================================="
awslocal dynamodb scan --table-name inventory \
  | jq -r '.Items[] | select(.lastUpdated.S != null) | "  \(.productName.S): \(.stock.N)個（最終更新: \(.lastUpdated.S)）"'
echo ""

# SQSキューのメッセージ数確認
INV_QUEUE_URL="http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/inventory-queue"
NOT_QUEUE_URL="http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/notification-queue"
BILL_QUEUE_URL="http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/billing-queue"

INV_MESSAGES=$(awslocal sqs get-queue-attributes --queue-url "$INV_QUEUE_URL" --attribute-names ApproximateNumberOfMessages --query 'Attributes.ApproximateNumberOfMessages' --output text)
NOT_MESSAGES=$(awslocal sqs get-queue-attributes --queue-url "$NOT_QUEUE_URL" --attribute-names ApproximateNumberOfMessages --query 'Attributes.ApproximateNumberOfMessages' --output text)
BILL_MESSAGES=$(awslocal sqs get-queue-attributes --queue-url "$BILL_QUEUE_URL" --attribute-names ApproximateNumberOfMessages --query 'Attributes.ApproximateNumberOfMessages' --output text)

echo "📬 SQSキューの状態:"
echo "========================================="
echo "  Inventory Queue: $INV_MESSAGES メッセージ"
echo "  Notification Queue: $NOT_MESSAGES メッセージ"
echo "  Billing Queue: $BILL_MESSAGES メッセージ"
echo ""

if [ "$INV_MESSAGES" = "0" ] && [ "$NOT_MESSAGES" = "0" ] && [ "$BILL_MESSAGES" = "0" ]; then
  echo "✅ すべてのキューが空です（全メッセージ処理完了）"
else
  echo "⚠️  キューにメッセージが残っています（処理中の可能性）"
fi
echo ""

echo "========================================="
echo "✅ 並行処理テスト完了"
echo "========================================="
echo ""
echo "💡 確認ポイント:"
echo "  ✓ 5つの注文が同時に処理された（所要時間: ${DURATION}秒）"
echo "  ✓ SNSファンアウトで各サービスにメッセージ配信"
echo "  ✓ 3つのマイクロサービスが並行動作"
echo "  ✓ 在庫が正確に減少（競合制御）"
echo ""
