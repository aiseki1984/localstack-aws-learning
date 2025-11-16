#!/bin/bash

# ========================================
# リソース確認スクリプト
# ========================================

set -e

echo "========================================="
echo "📊 DynamoDB テーブル確認"
echo "========================================="
awslocal dynamodb list-tables | jq -r '.TableNames[]' | while read table; do
  echo "  ✓ $table"
done
echo ""

echo "========================================="
echo "📢 SNS トピック確認"
echo "========================================="
awslocal sns list-topics | jq -r '.Topics[].TopicArn' | while read topic; do
  echo "  ✓ $topic"
done
echo ""

echo "========================================="
echo "📬 SQS キュー確認"
echo "========================================="
awslocal sqs list-queues | jq -r '.QueueUrls[]' | while read queue; do
  QUEUE_NAME=$(basename "$queue")
  echo "  ✓ $QUEUE_NAME"
done
echo ""

echo "========================================="
echo "🔗 SNS → SQS サブスクリプション確認"
echo "========================================="
TOPIC_ARN=$(awslocal sns list-topics | jq -r '.Topics[0].TopicArn')
echo "Topic: $TOPIC_ARN"
echo ""
awslocal sns list-subscriptions-by-topic --topic-arn "$TOPIC_ARN" | jq -r '.Subscriptions[] | "  ✓ \(.Protocol) → \(.Endpoint | split("/")[-1])"'
echo ""

echo "========================================="
echo "📈 CloudFormation スタック出力"
echo "========================================="
awslocal cloudformation describe-stacks --stack-name Project03Cdk03Stack | jq -r '.Stacks[0].Outputs[] | "  \(.OutputKey): \(.OutputValue)"'
echo ""

echo "✅ Phase 1 完了: すべてのリソースがデプロイされています！"
