#!/bin/bash
# S3バケット完全削除スクリプト（バージョニング対応）

BUCKET_NAME=$1

if [ -z "$BUCKET_NAME" ]; then
    echo "使用方法: $0 <bucket-name>"
    exit 1
fi

echo "バケット $BUCKET_NAME を完全削除します..."

# すべてのオブジェクトバージョンを削除
aws s3api list-object-versions --bucket "$BUCKET_NAME" --query 'Versions[].{Key:Key,VersionId:VersionId}' --output text | \
while read key version_id; do
    if [ "$key" != "None" ]; then
        echo "オブジェクトバージョンを削除: $key ($version_id)"
        aws s3api delete-object --bucket "$BUCKET_NAME" --key "$key" --version-id "$version_id"
    fi
done

# すべての削除マーカーを削除
aws s3api list-object-versions --bucket "$BUCKET_NAME" --query 'DeleteMarkers[].{Key:Key,VersionId:VersionId}' --output text | \
while read key version_id; do
    if [ "$key" != "None" ]; then
        echo "削除マーカーを削除: $key ($version_id)"
        aws s3api delete-object --bucket "$BUCKET_NAME" --key "$key" --version-id "$version_id"
    fi
done

# バケットを削除
echo "バケットを削除: $BUCKET_NAME"
aws s3api delete-bucket --bucket "$BUCKET_NAME"

echo "削除完了!"
