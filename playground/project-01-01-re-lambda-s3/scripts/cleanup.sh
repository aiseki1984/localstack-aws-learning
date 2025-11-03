#!/bin/bash

# S3 + Lambda クリーンアップスクリプト (LocalStack用)

set -e

# 環境変数の設定
export AWS_ACCESS_KEY_ID="test"
export AWS_SECRET_ACCESS_KEY="test"
export AWS_DEFAULT_REGION="us-east-1"
export AWS_REGION="us-east-1"

# LocalStackエンドポイントを環境変数から取得
if [ -z "$AWS_ENDPOINT_URL" ]; then
  echo "❌ AWS_ENDPOINT_URL環境変数が設定されていません"
  echo "   例: export AWS_ENDPOINT_URL=http://localstack:4566"
  exit 1
fi

# 設定（deploy.shと同じ値を使用）
FUNCTION_NAME="s3-text-handler"
BUCKET_NAME="my-test-bucket"
ROLE_NAME="lambda-s3-execution-role"

echo "🧹 S3 + Lambda クリーンアップ開始"
echo "====================================="
echo "📋 削除対象:"
echo "   Lambda関数: $FUNCTION_NAME"
echo "   S3バケット: $BUCKET_NAME"
echo "   IAMロール: $ROLE_NAME"
echo "   エンドポイント: $AWS_ENDPOINT_URL"
echo ""

# 確認プロンプト
read -p "❓ 本当にこれらのリソースを削除しますか？ (y/N): " confirm
echo ""

if [[ ! $confirm =~ ^[Yy]$ ]]; then
  echo "❌ クリーンアップをキャンセルしました"
  exit 0
fi

# クリーンアップ開始
echo "🚀 クリーンアップを開始します..."
echo ""

# 1. Lambda関数の削除
echo "⚡ Lambda関数を削除中..."
if aws lambda get-function --function-name $FUNCTION_NAME --endpoint-url=$AWS_ENDPOINT_URL --region $AWS_REGION >/dev/null 2>&1; then
  aws lambda delete-function \
    --function-name $FUNCTION_NAME \
    --endpoint-url=$AWS_ENDPOINT_URL \
    --region $AWS_REGION
  echo "  ✅ Lambda関数 '$FUNCTION_NAME' を削除しました"
else
  echo "  ℹ️ Lambda関数 '$FUNCTION_NAME' は存在しません（既に削除済み）"
fi

# 2. S3バケットの削除（内容も含めて）
echo ""
echo "📦 S3バケットを削除中..."
if aws s3api head-bucket --bucket $BUCKET_NAME --endpoint-url=$AWS_ENDPOINT_URL --region $AWS_REGION >/dev/null 2>&1; then
  # バケット内のオブジェクトをまず削除
  echo "  📁 バケット内のオブジェクトを削除中..."
  object_count=$(aws s3 ls s3://$BUCKET_NAME --recursive --endpoint-url=$AWS_ENDPOINT_URL --region $AWS_REGION 2>/dev/null | wc -l)
  
  if [ $object_count -gt 0 ]; then
    aws s3 rm s3://$BUCKET_NAME --recursive \
      --endpoint-url=$AWS_ENDPOINT_URL \
      --region $AWS_REGION
    echo "    ✅ ${object_count}個のオブジェクトを削除しました"
  else
    echo "    ℹ️ バケットにオブジェクトはありません"
  fi
  
  # バケット自体を削除
  aws s3api delete-bucket \
    --bucket $BUCKET_NAME \
    --endpoint-url=$AWS_ENDPOINT_URL \
    --region $AWS_REGION
  echo "  ✅ S3バケット '$BUCKET_NAME' を削除しました"
else
  echo "  ℹ️ S3バケット '$BUCKET_NAME' は存在しません（既に削除済み）"
fi

# 3. IAMロールからポリシーをデタッチ
echo ""
echo "🔑 IAMポリシーをデタッチ中..."
if aws iam get-role --role-name $ROLE_NAME --endpoint-url=$AWS_ENDPOINT_URL --region $AWS_REGION >/dev/null 2>&1; then
  # アタッチされたポリシーを確認してデタッチ
  attached_policies=$(aws iam list-attached-role-policies \
    --role-name $ROLE_NAME \
    --endpoint-url=$AWS_ENDPOINT_URL \
    --region $AWS_REGION \
    --query 'AttachedPolicies[*].PolicyArn' \
    --output text 2>/dev/null)
  
  if [ -n "$attached_policies" ]; then
    for policy_arn in $attached_policies; do
      aws iam detach-role-policy \
        --role-name $ROLE_NAME \
        --policy-arn $policy_arn \
        --endpoint-url=$AWS_ENDPOINT_URL \
        --region $AWS_REGION
      echo "  ✅ ポリシー '$policy_arn' をデタッチしました"
    done
  else
    echo "  ℹ️ アタッチされたポリシーはありません"
  fi
else
  echo "  ℹ️ IAMロール '$ROLE_NAME' は存在しません（既に削除済み）"
fi

# 4. IAMロールの削除
echo ""
echo "🔐 IAMロールを削除中..."
if aws iam get-role --role-name $ROLE_NAME --endpoint-url=$AWS_ENDPOINT_URL --region $AWS_REGION >/dev/null 2>&1; then
  aws iam delete-role \
    --role-name $ROLE_NAME \
    --endpoint-url=$AWS_ENDPOINT_URL \
    --region $AWS_REGION
  echo "  ✅ IAMロール '$ROLE_NAME' を削除しました"
else
  echo "  ℹ️ IAMロール '$ROLE_NAME' は存在しません（既に削除済み）"
fi

# 5. ローカルファイルの削除
echo ""
echo "📁 一時ファイルを削除中..."
cleanup_files=(
  "lambda/function.zip"
  "response.json"
  "payload.txt"
  "upload_response.json"
  "list_response.json" 
  "get_response.json"
  "upload_payload.txt"
  "list_payload.txt"
  "get_payload.txt"
)

deleted_local_count=0
for file in "${cleanup_files[@]}"; do
  if [ -f "$file" ]; then
    rm -f "$file"
    echo "  ✅ 削除: $file"
    ((deleted_local_count++))
  fi
done

if [ $deleted_local_count -eq 0 ]; then
  echo "  ℹ️ 削除対象のローカルファイルはありません"
else
  echo "  ✅ ${deleted_local_count}個のローカルファイルを削除しました"
fi

# dist ディレクトリの削除（存在する場合）
if [ -d "lambda/dist" ]; then
  rm -rf "lambda/dist"
  echo "  ✅ ビルド出力ディレクトリ (lambda/dist) を削除しました"
fi

echo ""
echo "✅ クリーンアップ完了!"
echo "=============================="
echo "📋 削除されたリソース:"
echo "   ✓ Lambda関数: $FUNCTION_NAME"
echo "   ✓ S3バケット: $BUCKET_NAME（内容含む）"
echo "   ✓ IAMロール: $ROLE_NAME（ポリシー含む）"
echo "   ✓ 一時ファイル・ビルド出力"
echo ""
echo "🔄 次のステップ:"
echo "   📋 リソース確認: ./scripts/list-resources.sh"
echo "   🚀 再デプロイ: ./scripts/deploy.sh"
echo "   🔄 LocalStack全体リセット: docker-compose down && docker-compose up -d"
echo ""
echo "💡 プロジェクトファイル（lambda/src/, scripts/など）は保持されています"