#!/bin/bash

# ========================================
# Phase 3 動作確認スクリプト
# ========================================

set -e

echo "========================================="
echo "🔍 Phase 3: マイクロサービス動作確認"
echo "========================================="
echo ""

# 1. 在庫テーブルを確認
echo "📦 1. Inventory Table (在庫状態)"
echo "========================================="
awslocal dynamodb scan --table-name inventory \
  | jq -r '.Items[] | "  \(.productName.S): \(.stock.N)個（最終更新: \(.lastUpdated?.S // "N/A")）"'
echo ""

# 2. 通知テーブルを確認
echo "📧 2. Notifications Table (通知履歴)"
echo "========================================="
NOTIFICATION_COUNT=$(awslocal dynamodb scan --table-name notifications --select "COUNT" | jq '.Count')
echo "  通知レコード数: $NOTIFICATION_COUNT件"

if [ "$NOTIFICATION_COUNT" -gt 0 ]; then
  echo ""
  awslocal dynamodb scan --table-name notifications \
    | jq -r '.Items[] | "  ✉️  \(.type.S) → \(.customerEmail.S) (送信: \(.status.S))"'
fi
echo ""

# 3. 請求テーブルを確認
echo "💳 3. Billing Table (請求レコード)"
echo "========================================="
BILLING_COUNT=$(awslocal dynamodb scan --table-name billing --select "COUNT" | jq '.Count')
echo "  請求レコード数: $BILLING_COUNT件"

if [ "$BILLING_COUNT" -gt 0 ]; then
  echo ""
  awslocal dynamodb scan --table-name billing \
    | jq -r '.Items[] | "  💰 Order \(.orderId.S[:8])...: 小計 ¥\(.subtotal.N) + 税 ¥\(.tax.N) = 合計 ¥\(.total.N)"'
fi
echo ""

# 4. Lambda実行ログを確認
echo "📜 4. Lambda実行ログ"
echo "========================================="

echo "  📦 Inventory Service:"
awslocal logs tail /aws/lambda/inventory-service --since 5m --format short 2>/dev/null | tail -n 3 || echo "    （ログなし）"
echo ""

echo "  📧 Notification Service:"
awslocal logs tail /aws/lambda/notification-service --since 5m --format short 2>/dev/null | tail -n 3 || echo "    （ログなし）"
echo ""

echo "  💳 Billing Service:"
awslocal logs tail /aws/lambda/billing-service --since 5m --format short 2>/dev/null | tail -n 3 || echo "    （ログなし）"
echo ""

# 5. DLQの状態確認
echo "🗑️  5. Dead Letter Queue (DLQ)"
echo "========================================="
DLQ_MESSAGES=$(awslocal sqs get-queue-attributes \
  --queue-url "http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/order-processing-dlq" \
  --attribute-names ApproximateNumberOfMessages \
  --query 'Attributes.ApproximateNumberOfMessages' \
  --output text)

if [ "$DLQ_MESSAGES" = "0" ]; then
  echo "  ✅ DLQは空です（エラーなし）"
else
  echo "  ⚠️  DLQに $DLQ_MESSAGES 件のメッセージがあります"
fi
echo ""

echo "========================================="
echo "✅ Phase 3 確認完了！"
echo "========================================="
echo ""
echo "💡 確認事項:"
echo "  ✓ 在庫が減っていればInventory Service動作OK"
echo "  ✓ 通知レコードがあればNotification Service動作OK"
echo "  ✓ 請求レコードがあればBilling Service動作OK"
echo "  ✓ DLQが空ならエラーハンドリングOK"
echo ""
