#!/bin/bash

# ファイル処理システムのテストスクリプト
set -e

UPLOAD_BUCKET="file-processor-uploads"
PROCESSED_BUCKET="file-processor-processed"
TABLE_NAME="file-metadata"
QUEUE_URL="http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/file-processing-queue"

echo "======================================"
echo "ファイル処理システムのテスト"
echo "======================================"

# 1. テストファイルを作成
echo ""
echo "📝 1. テストファイルを作成..."
TEST_FILE="./_tmp/test-$(date +%s).txt"
echo "LocalStackでのイベント駆動型ファイル処理のテストです。タイムスタンプ: $(date)" > ${TEST_FILE}
echo "   作成: ${TEST_FILE}"

# 2. S3にアップロード
echo ""
echo "📤 2. S3にファイルをアップロード..."
FILE_NAME=$(basename ${TEST_FILE})
awslocal s3 cp ${TEST_FILE} s3://${UPLOAD_BUCKET}/${FILE_NAME}
echo "   アップロード完了: s3://${UPLOAD_BUCKET}/${FILE_NAME}"

# 3. SQSメッセージを確認
echo ""
echo "📬 3. SQSキューを確認..."
sleep 2
MESSAGES=$(awslocal sqs get-queue-attributes \
  --queue-url ${QUEUE_URL} \
  --attribute-names ApproximateNumberOfMessages \
  --query 'Attributes.ApproximateNumberOfMessages' \
  --output text)
echo "   キューのメッセージ数: ${MESSAGES}"

# 4. メッセージがあれば取得して表示
if [ "${MESSAGES}" -gt "0" ]; then
  echo ""
  echo "📨 4. メッセージを取得..."
  awslocal sqs receive-message --queue-url ${QUEUE_URL} --max-number-of-messages 1 | jq .
fi

# 5. Lambda関数を手動で呼び出す（LocalStackの制限を回避）
echo ""
echo "⚡ 5. Lambda関数を手動でトリガー..."

# S3イベントのペイロードを作成
EVENT_PAYLOAD=$(cat <<EOF
{
  "Records": [
    {
      "body": "{\"Records\":[{\"eventVersion\":\"2.1\",\"eventSource\":\"aws:s3\",\"awsRegion\":\"us-east-1\",\"eventTime\":\"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",\"eventName\":\"ObjectCreated:Put\",\"s3\":{\"bucket\":{\"name\":\"${UPLOAD_BUCKET}\"},\"object\":{\"key\":\"${FILE_NAME}\",\"size\":$(stat -f%z ${TEST_FILE} 2>/dev/null || stat -c%s ${TEST_FILE})}}}]}"
    }
  ]
}
EOF
)

echo "${EVENT_PAYLOAD}" > /tmp/lambda-event.json
awslocal lambda invoke \
  --function-name file-processor \
  --cli-binary-format raw-in-base64-out \
  --payload "${EVENT_PAYLOAD}" \
  /tmp/lambda-response.json

echo ""
echo "Lambda応答:"
cat /tmp/lambda-response.json | jq .

# 6. 結果を確認
echo ""
echo "======================================"
echo "📊 処理結果の確認"
echo "======================================"

echo ""
echo "🗄️ DynamoDBテーブル:"
awslocal dynamodb scan --table-name ${TABLE_NAME} \
  --query 'Items[*].{FileID:fileId.S,Status:status.S,Size:fileSize.N,Timestamp:timestamp.S}' \
  --output table

echo ""
echo "📦 処理済みバケット:"
awslocal s3 ls s3://${PROCESSED_BUCKET}/

echo ""
echo "📦 アップロードバケット（元ファイルは削除されているはず）:"
awslocal s3 ls s3://${UPLOAD_BUCKET}/

echo ""
echo "======================================"
echo "✅ テスト完了！"
echo "======================================"
