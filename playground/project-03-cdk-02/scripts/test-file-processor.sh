#!/bin/bash

# ファイル処理システムのテストスクリプト
# S3イベント通知による自動処理をテストします
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
mkdir -p ./_tmp
TEST_FILE="./_tmp/test-$(date +%s).txt"
echo "LocalStackでのイベント駆動型ファイル処理のテストです。タイムスタンプ: $(date)" > ${TEST_FILE}
echo "   作成: ${TEST_FILE}"
FILE_NAME=$(basename ${TEST_FILE})

# 2. S3イベント通知が設定されているか確認
echo ""
echo "🔧 2. S3イベント通知の設定を確認..."
NOTIFICATION_CONFIG=$(awslocal s3api get-bucket-notification-configuration --bucket ${UPLOAD_BUCKET} 2>/dev/null)
if [ -n "${NOTIFICATION_CONFIG}" ] && echo "${NOTIFICATION_CONFIG}" | jq -e '.QueueConfigurations | length > 0' > /dev/null 2>&1; then
  echo "   ✅ S3イベント通知が設定されています"
else
  echo "   ❌ S3イベント通知が設定されていません"
  echo "   デプロイ時にL1コンストラクトによる設定が必要です"
  exit 1
fi

# 3. S3にアップロード
echo ""
echo "📤 3. S3にファイルをアップロード..."
awslocal s3 cp ${TEST_FILE} s3://${UPLOAD_BUCKET}/${FILE_NAME}
echo "   アップロード完了: s3://${UPLOAD_BUCKET}/${FILE_NAME}"
echo "   ⏳ 自動処理を待機中..."

# 4. 処理完了を待つ（最大30秒）
echo ""
echo "⏱️  4. 処理完了を待機..."
MAX_WAIT=30
ELAPSED=0
PROCESSED=false

while [ ${ELAPSED} -lt ${MAX_WAIT} ]; do
  sleep 2
  ELAPSED=$((ELAPSED + 2))
  
  # DynamoDBにレコードがあるか確認
  ITEM_COUNT=$(awslocal dynamodb scan --table-name ${TABLE_NAME} \
    --filter-expression "fileId = :fid" \
    --expression-attribute-values "{\":fid\":{\"S\":\"${FILE_NAME}\"}}" \
    --select COUNT \
    --query 'Count' \
    --output text 2>/dev/null || echo "0")
  
  if [ "${ITEM_COUNT}" -gt "0" ]; then
    PROCESSED=true
    echo "   ✅ 処理完了！（${ELAPSED}秒）"
    break
  fi
  
  echo -n "."
done

echo ""

if [ "${PROCESSED}" = false ]; then
  echo "   ⚠️  タイムアウト: ${MAX_WAIT}秒以内に処理が完了しませんでした"
  echo ""
  echo "   SQSキューの状態を確認:"
  awslocal sqs get-queue-attributes \
    --queue-url ${QUEUE_URL} \
    --attribute-names ApproximateNumberOfMessages,ApproximateNumberOfMessagesNotVisible \
    --output json | jq '.Attributes'
  echo ""
  echo "   Lambdaのログを確認してください:"
  echo "   awslocal logs tail /aws/lambda/file-processor --since 5m"
  exit 1
fi

# 5. 結果を確認
echo ""
echo "======================================"
echo "📊 処理結果の確認"
echo "======================================"

# 5.1 今回処理されたファイルの詳細
echo ""
echo "📄 処理されたファイルの詳細:"
awslocal dynamodb get-item \
  --table-name ${TABLE_NAME} \
  --key "{\"fileId\":{\"S\":\"${FILE_NAME}\"},\"timestamp\":{\"S\":\"$(awslocal dynamodb scan --table-name ${TABLE_NAME} --filter-expression 'fileId = :fid' --expression-attribute-values "{\":fid\":{\"S\":\"${FILE_NAME}\"}}" --query 'Items[0].timestamp.S' --output text)\"}}" \
  --query 'Item.{FileID:fileId.S,Status:status.S,Size:fileSize.N,ContentType:contentType.S,ProcessedAt:processedAt.S,OriginalBucket:originalBucket.S,OriginalKey:originalKey.S}' \
  --output json 2>/dev/null || echo "詳細情報の取得に失敗しました"

# 5.2 処理済みバケットを確認
echo ""
echo "📦 処理済みバケット:"
PROCESSED_FILES=$(awslocal s3 ls s3://${PROCESSED_BUCKET}/processed/ | grep ${FILE_NAME} || echo "")
if [ -n "${PROCESSED_FILES}" ]; then
  echo "   ✅ ファイルが処理済みバケットに移動されました"
  echo "${PROCESSED_FILES}"
else
  echo "   ❌ 処理済みバケットにファイルが見つかりません"
fi

# 5.3 元のバケットを確認
echo ""
echo "📦 アップロードバケット:"
UPLOAD_FILES=$(awslocal s3 ls s3://${UPLOAD_BUCKET}/ | grep ${FILE_NAME} || echo "")
if [ -z "${UPLOAD_FILES}" ]; then
  echo "   ✅ 元のファイルが削除されました（期待通り）"
else
  echo "   ⚠️  元のファイルがまだ残っています:"
  echo "${UPLOAD_FILES}"
fi

# 5.4 全体のサマリー
echo ""
echo "📈 システム全体のサマリー:"
TOTAL_PROCESSED=$(awslocal dynamodb scan --table-name ${TABLE_NAME} --select COUNT --query 'Count' --output text)
echo "   処理済みファイル総数: ${TOTAL_PROCESSED}"

echo ""
echo "======================================"
echo "✅ テスト完了！"
echo "======================================"
echo ""
echo "💡 ヒント:"
echo "   - 複数ファイルのテスト: for i in {1..3}; do bash scripts/test-file-processor.sh; sleep 2; done"
echo "   - 全処理履歴を表示: awslocal dynamodb scan --table-name ${TABLE_NAME} --output table"
echo "   - Lambdaログを確認: awslocal logs tail /aws/lambda/file-processor --since 10m"
