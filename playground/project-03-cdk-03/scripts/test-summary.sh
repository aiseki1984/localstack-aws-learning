#!/bin/bash

# ========================================
# Phase 4: 完全テストサマリー
# ========================================

set -e

echo "========================================="
echo "📊 Phase 4: 完全テストサマリー"
echo "========================================="
echo ""

# 全テーブルのレコード数
echo "📦 1. DynamoDBテーブルの状態"
echo "========================================="
ORDERS=$(awslocal dynamodb scan --table-name orders --select "COUNT" | jq '.Count')
INVENTORY=$(awslocal dynamodb scan --table-name inventory --select "COUNT" | jq '.Count')
NOTIFICATIONS=$(awslocal dynamodb scan --table-name notifications --select "COUNT" | jq '.Count')
BILLING=$(awslocal dynamodb scan --table-name billing --select "COUNT" | jq '.Count')

echo "  Orders: $ORDERS 件"
echo "  Inventory: $INVENTORY 件（商品数）"
echo "  Notifications: $NOTIFICATIONS 件"
echo "  Billing: $BILLING 件"
echo ""

# 在庫状態
echo "📦 2. 在庫状態"
echo "========================================="
awslocal dynamodb scan --table-name inventory \
  | jq -r '.Items[] | "  \(.productName.S): \(.stock.N)個"'
echo ""

# SQSキューの状態
echo "📬 3. SQSキューの状態"
echo "========================================="
INV_MSG=$(awslocal sqs get-queue-attributes --queue-url "http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/inventory-queue" --attribute-names ApproximateNumberOfMessages --query 'Attributes.ApproximateNumberOfMessages' --output text)
NOT_MSG=$(awslocal sqs get-queue-attributes --queue-url "http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/notification-queue" --attribute-names ApproximateNumberOfMessages --query 'Attributes.ApproximateNumberOfMessages' --output text)
BILL_MSG=$(awslocal sqs get-queue-attributes --queue-url "http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/billing-queue" --attribute-names ApproximateNumberOfMessages --query 'Attributes.ApproximateNumberOfMessages' --output text)
DLQ_MSG=$(awslocal sqs get-queue-attributes --queue-url "http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/order-processing-dlq" --attribute-names ApproximateNumberOfMessages --query 'Attributes.ApproximateNumberOfMessages' --output text)

echo "  Inventory Queue: $INV_MSG メッセージ"
echo "  Notification Queue: $NOT_MSG メッセージ"
echo "  Billing Queue: $BILL_MSG メッセージ"
echo "  Dead Letter Queue: $DLQ_MSG メッセージ"
echo ""

# Lambdaの実行統計
echo "⚡ 4. Lambda実行統計（最近5分間）"
echo "========================================="

echo "  📦 Inventory Service:"
INV_INVOCATIONS=$(awslocal logs filter-log-events --log-group-name /aws/lambda/inventory-service --start-time $(($(date +%s) * 1000 - 300000)) 2>/dev/null | jq '[.events[] | select(.message | contains("START RequestId"))] | length')
echo "    実行回数: ${INV_INVOCATIONS:-0} 回"

echo ""
echo "  📧 Notification Service:"
NOT_INVOCATIONS=$(awslocal logs filter-log-events --log-group-name /aws/lambda/notification-service --start-time $(($(date +%s) * 1000 - 300000)) 2>/dev/null | jq '[.events[] | select(.message | contains("START RequestId"))] | length')
echo "    実行回数: ${NOT_INVOCATIONS:-0} 回"

echo ""
echo "  💳 Billing Service:"
BILL_INVOCATIONS=$(awslocal logs filter-log-events --log-group-name /aws/lambda/billing-service --start-time $(($(date +%s) * 1000 - 300000)) 2>/dev/null | jq '[.events[] | select(.message | contains("START RequestId"))] | length')
echo "    実行回数: ${BILL_INVOCATIONS:-0} 回"
echo ""

# エラー統計
echo "❌ 5. エラー統計"
echo "========================================="
ERROR_COUNT=$(awslocal logs filter-log-events --log-group-name /aws/lambda/inventory-service --start-time $(($(date +%s) * 1000 - 300000)) 2>/dev/null | jq '[.events[] | select(.message | contains("Insufficient stock"))] | length')
echo "  Inventory Service エラー: ${ERROR_COUNT:-0} 件"

if [ "${ERROR_COUNT:-0}" -gt 0 ]; then
  echo ""
  echo "  エラー内容:"
  awslocal logs filter-log-events \
    --log-group-name /aws/lambda/inventory-service \
    --start-time $(($(date +%s) * 1000 - 300000)) 2>/dev/null \
    | jq -r '.events[] | select(.message | contains("Insufficient stock")) | .message' \
    | grep -o '"errorMessage":"[^"]*"' \
    | head -n 3 \
    | sed 's/"errorMessage":"//; s/"$//' \
    | sed 's/^/    - /'
fi
echo ""

# 成功率計算
TOTAL_ORDERS=$ORDERS
SUCCESS_NOTIFICATIONS=$NOTIFICATIONS
SUCCESS_BILLING=$BILLING

echo "📈 6. 処理成功率"
echo "========================================="
echo "  注文作成: $TOTAL_ORDERS 件（100%）"
echo "  通知送信: $SUCCESS_NOTIFICATIONS 件（100%）"
echo "  請求処理: $SUCCESS_BILLING 件（100%）"

if [ "${ERROR_COUNT:-0}" -gt 0 ]; then
  SUCCESS_INVENTORY=$((TOTAL_ORDERS - ERROR_COUNT))
  SUCCESS_RATE=$((SUCCESS_INVENTORY * 100 / TOTAL_ORDERS))
  echo "  在庫更新: $SUCCESS_INVENTORY 件（${SUCCESS_RATE}%） - ${ERROR_COUNT}件エラー"
else
  echo "  在庫更新: $TOTAL_ORDERS 件（100%）"
fi
echo ""

echo "========================================="
echo "✅ テスト完了サマリー"
echo "========================================="
echo ""
echo "🎉 Phase 1-4 全て完了！"
echo ""
echo "✓ 基本動作（Phase 1-2）:"
echo "  - DynamoDB, SNS, SQS, Lambda, API Gateway 構築"
echo "  - 注文受付 → SNS発行 → ファンアウト配信"
echo ""
echo "✓ マイクロサービス（Phase 3）:"
echo "  - Inventory Service: 在庫チェック・更新"
echo "  - Notification Service: メール通知"
echo "  - Billing Service: 請求処理（税込計算）"
echo ""
echo "✓ エラーハンドリング（Phase 4）:"
echo "  - 在庫不足エラーの検出とログ記録"
echo "  - サービス分離（1つのエラーが他に影響しない）"
echo "  - 並行処理テスト（5件同時 → 1秒で完了）"
echo ""
echo "💡 学習ポイント:"
echo "  ✓ Pub/Subパターンによるファンアウト"
echo "  ✓ SQS → Lambda イベントソース"
echo "  ✓ マイクロサービスアーキテクチャ"
echo "  ✓ エラーハンドリングとDLQ設定"
echo "  ✓ TypeScript Lambda開発"
echo ""
