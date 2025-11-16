#!/bin/bash

# LocalStackのS3イベント通知を手動で設定するスクリプト
# CDKのCustom::S3BucketNotificationsがLocalStackで動作しない場合の回避策

set -e

BUCKET_NAME="file-processor-uploads"
QUEUE_ARN="arn:aws:sqs:us-east-1:000000000000:file-processing-queue"

echo "======================================"
echo "S3イベント通知の設定"
echo "======================================"

# イベント通知設定のJSON
NOTIFICATION_CONFIG=$(cat <<EOF
{
  "QueueConfigurations": [
    {
      "QueueArn": "${QUEUE_ARN}",
      "Events": ["s3:ObjectCreated:*"]
    }
  ]
}
EOF
)

echo ""
echo "📝 設定内容:"
echo "${NOTIFICATION_CONFIG}" | jq .

echo ""
echo "⚙️  S3バケットにイベント通知を設定中..."
awslocal s3api put-bucket-notification-configuration \
  --bucket ${BUCKET_NAME} \
  --notification-configuration "${NOTIFICATION_CONFIG}"

echo ""
echo "✅ 設定完了！"

echo ""
echo "📋 確認:"
awslocal s3api get-bucket-notification-configuration \
  --bucket ${BUCKET_NAME} | jq .

echo ""
echo "======================================"
echo "設定完了！ファイルをアップロードしてテストしてください。"
echo "======================================"
