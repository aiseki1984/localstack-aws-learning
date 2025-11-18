#!/bin/bash

# ========================================
# DLQ確認とリトライスクリプト
# ========================================

set -e

DLQ_URL="http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/order-processing-dlq"
INV_QUEUE_URL="http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/inventory-queue"

echo "========================================="
echo "🗑️  Dead Letter Queue (DLQ) 管理"
echo "========================================="
echo ""

# DLQのメッセージ数確認
DLQ_COUNT=$(awslocal sqs get-queue-attributes \
  --queue-url "$DLQ_URL" \
  --attribute-names ApproximateNumberOfMessages \
  --query 'Attributes.ApproximateNumberOfMessages' \
  --output text)

echo "📊 DLQメッセージ数: $DLQ_COUNT 件"
echo ""

if [ "$DLQ_COUNT" = "0" ]; then
  echo "✅ DLQは空です（エラーなし）"
  echo ""
  exit 0
fi

# DLQのメッセージを表示
echo "📨 DLQメッセージ一覧:"
echo "========================================="

MESSAGES=$(awslocal sqs receive-message \
  --queue-url "$DLQ_URL" \
  --max-number-of-messages 10 \
  --attribute-names All)

MESSAGE_COUNT=$(echo "$MESSAGES" | jq '.Messages | length')

if [ "$MESSAGE_COUNT" -eq 0 ]; then
  echo "  （メッセージを取得できませんでした）"
  echo ""
  exit 0
fi

echo "取得したメッセージ: $MESSAGE_COUNT 件"
echo ""

# 各メッセージの詳細を表示
for i in $(seq 0 $((MESSAGE_COUNT - 1))); do
  echo "--- メッセージ $((i + 1)) ---"
  
  MESSAGE_BODY=$(echo "$MESSAGES" | jq -r ".Messages[$i].Body")
  RECEIPT_HANDLE=$(echo "$MESSAGES" | jq -r ".Messages[$i].ReceiptHandle")
  
  echo "$MESSAGE_BODY" | jq '.'
  
  # エラー原因を抽出
  ORDER_ID=$(echo "$MESSAGE_BODY" | jq -r '.order.orderId // .orderId // "N/A"')
  
  echo ""
  echo "  Order ID: $ORDER_ID"
  echo "  Receipt Handle: ${RECEIPT_HANDLE:0:50}..."
  echo ""
done

# リトライオプション
echo "========================================="
echo "🔄 リトライオプション"
echo "========================================="
echo ""
echo "1. すべてのメッセージを元のキューに戻す（リトライ）"
echo "2. すべてのメッセージを削除（廃棄）"
echo "3. 何もしない（終了）"
echo ""

read -p "選択してください (1/2/3): " choice

case $choice in
  1)
    echo ""
    echo "🔄 メッセージを inventory-queue に転送します..."
    
    for i in $(seq 0 $((MESSAGE_COUNT - 1))); do
      MESSAGE_BODY=$(echo "$MESSAGES" | jq -r ".Messages[$i].Body")
      RECEIPT_HANDLE=$(echo "$MESSAGES" | jq -r ".Messages[$i].ReceiptHandle")
      
      # 元のキューに送信
      awslocal sqs send-message \
        --queue-url "$INV_QUEUE_URL" \
        --message-body "$MESSAGE_BODY" > /dev/null
      
      # DLQから削除
      awslocal sqs delete-message \
        --queue-url "$DLQ_URL" \
        --receipt-handle "$RECEIPT_HANDLE"
      
      echo "  ✓ メッセージ $((i + 1)) を転送しました"
    done
    
    echo ""
    echo "✅ すべてのメッセージを inventory-queue に転送しました"
    echo "⏳ Lambda が自動処理を開始します..."
    ;;
    
  2)
    echo ""
    echo "🗑️  メッセージを削除します..."
    
    for i in $(seq 0 $((MESSAGE_COUNT - 1))); do
      RECEIPT_HANDLE=$(echo "$MESSAGES" | jq -r ".Messages[$i].ReceiptHandle")
      
      awslocal sqs delete-message \
        --queue-url "$DLQ_URL" \
        --receipt-handle "$RECEIPT_HANDLE"
      
      echo "  ✓ メッセージ $((i + 1)) を削除しました"
    done
    
    echo ""
    echo "✅ すべてのメッセージを削除しました"
    ;;
    
  3)
    echo ""
    echo "ℹ️  何もせずに終了します"
    ;;
    
  *)
    echo ""
    echo "❌ 無効な選択です"
    exit 1
    ;;
esac

echo ""
