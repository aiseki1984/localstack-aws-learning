#!/bin/bash

# S3 + Lambda リソース確認スクリプト (LocalStack用)

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

echo "🔍 S3 + Lambda リソース確認"
echo "📋 エンドポイント: $AWS_ENDPOINT_URL"
echo "======================================"
echo ""

# LocalStackの健康状態確認
echo "🏥 LocalStack健康状態:"
if curl -s "${AWS_ENDPOINT_URL}/_localstack/health" > /dev/null; then
  curl -s "${AWS_ENDPOINT_URL}/_localstack/health" | jq -r '.services | to_entries[] | select(.value == "running") | "  ✅ \(.key): \(.value)"'
  echo ""
else
  echo "  ❌ LocalStackに接続できません"
  exit 1
fi

# Lambda関数の確認
echo "⚡ Lambda関数:"
lambda_functions=$(aws lambda list-functions \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION \
  --query 'Functions[*].{Name:FunctionName,Runtime:Runtime,Handler:Handler,Size:CodeSize}' \
  --output table 2>/dev/null)

if [ $? -eq 0 ] && [ -n "$lambda_functions" ]; then
  echo "$lambda_functions"
else
  echo "  📭 Lambda関数が見つかりません"
fi
echo ""

# S3バケットの確認
echo "📦 S3バケット:"
s3_buckets=$(aws s3api list-buckets \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION \
  --query 'Buckets[*].{Name:Name,Created:CreationDate}' \
  --output table 2>/dev/null)

if [ $? -eq 0 ] && [ -n "$s3_buckets" ]; then
  echo "$s3_buckets"
  
  # 各バケットの内容確認
  echo ""
  echo "📁 S3バケット内容:"
  bucket_names=$(aws s3api list-buckets \
    --endpoint-url=$AWS_ENDPOINT_URL \
    --region $AWS_REGION \
    --query 'Buckets[*].Name' \
    --output text 2>/dev/null)
  
  if [ -n "$bucket_names" ]; then
    for bucket in $bucket_names; do
      echo "  🗂️ バケット: $bucket"
      object_count=$(aws s3 ls s3://$bucket --recursive \
        --endpoint-url=$AWS_ENDPOINT_URL \
        --region $AWS_REGION 2>/dev/null | wc -l)
      
      if [ $object_count -gt 0 ]; then
        echo "    📄 オブジェクト数: $object_count"
        aws s3 ls s3://$bucket --recursive \
          --endpoint-url=$AWS_ENDPOINT_URL \
          --region $AWS_REGION | head -10 | while read line; do
          echo "      $line"
        done
        if [ $object_count -gt 10 ]; then
          echo "      ... (他 $((object_count - 10))個のファイル)"
        fi
      else
        echo "    📭 オブジェクトなし"
      fi
      echo ""
    done
  fi
else
  echo "  📭 S3バケットが見つかりません"
fi

# IAMロールの確認
echo "🔐 IAMロール:"
iam_roles=$(aws iam list-roles \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION \
  --query 'Roles[*].{Name:RoleName,Created:CreateDate,Path:Path}' \
  --output table 2>/dev/null)

if [ $? -eq 0 ] && [ -n "$iam_roles" ]; then
  echo "$iam_roles"
else
  echo "  📭 IAMロールが見つかりません"
fi
echo ""

# IAMポリシーの確認
echo "🔑 IAMポリシー (ロールにアタッチ済み):"
role_names=$(aws iam list-roles \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION \
  --query 'Roles[*].RoleName' \
  --output text 2>/dev/null)

if [ -n "$role_names" ]; then
  for role in $role_names; do
    echo "  👤 ロール: $role"
    policies=$(aws iam list-attached-role-policies \
      --role-name $role \
      --endpoint-url=$AWS_ENDPOINT_URL \
      --region $AWS_REGION \
      --query 'AttachedPolicies[*].PolicyName' \
      --output text 2>/dev/null)
    
    if [ -n "$policies" ]; then
      for policy in $policies; do
        echo "    📋 ポリシー: $policy"
      done
    else
      echo "    📭 アタッチされたポリシーなし"
    fi
  done
else
  echo "  📭 IAMロールが見つかりません"
fi
echo ""

# サマリー情報
echo "📊 リソースサマリー:"
lambda_count=$(aws lambda list-functions --endpoint-url=$AWS_ENDPOINT_URL --region $AWS_REGION --query 'length(Functions)' --output text 2>/dev/null || echo "0")
s3_count=$(aws s3api list-buckets --endpoint-url=$AWS_ENDPOINT_URL --region $AWS_REGION --query 'length(Buckets)' --output text 2>/dev/null || echo "0")
iam_count=$(aws iam list-roles --endpoint-url=$AWS_ENDPOINT_URL --region $AWS_REGION --query 'length(Roles)' --output text 2>/dev/null || echo "0")

echo "  ⚡ Lambda関数: ${lambda_count}個"
echo "  📦 S3バケット: ${s3_count}個"
echo "  🔐 IAMロール: ${iam_count}個"

echo ""
echo "🧹 リソースを削除したい場合:"
echo "   ./scripts/cleanup.sh - 個別削除"
echo "   docker-compose down && docker-compose up -d - LocalStack全体リセット"
echo ""
echo "🔄 再デプロイしたい場合:"
echo "   ./scripts/deploy.sh"