#!/bin/bash

# Lambda + S3 デプロイメントスクリプト (LocalStack用)

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

# 設定
FUNCTION_NAME="s3-text-handler"
BUCKET_NAME="my-test-bucket"
ROLE_NAME="lambda-s3-execution-role"
RUNTIME="nodejs20.x"  # Node.jsバージョンを指定可能
HANDLER="index.handler"

echo "🚀 Lambda + S3 デプロイメント開始"
echo "📋 設定:"
echo "   Function: $FUNCTION_NAME"
echo "   Bucket: $BUCKET_NAME"
echo "   Runtime: $RUNTIME"
echo "   Region: $AWS_REGION"
echo "   Endpoint: $AWS_ENDPOINT_URL"

# 1. S3バケットの作成
echo "📦 S3バケットを作成中..."
aws s3 mb s3://$BUCKET_NAME \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION || echo "バケットは既に存在します"

# バケット一覧を表示
echo "📋 S3バケット一覧:"
aws s3 ls \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION

# 2. IAMロールの作成
echo "🔐 IAMロールを作成中..."
aws iam create-role \
  --role-name $ROLE_NAME \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {"Service": "lambda.amazonaws.com"},
        "Action": "sts:AssumeRole"
      }
    ]
  }' \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION || echo "ロールは既に存在します"

# IAMポリシーをアタッチ（S3フルアクセス）
echo "🔑 S3アクセスポリシーをアタッチ中..."
aws iam attach-role-policy \
  --role-name $ROLE_NAME \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION || echo "ポリシーは既にアタッチされています"

# IAMロールのARNを設定
LAMBDA_ROLE_ARN="arn:aws:iam::000000000000:role/$ROLE_NAME"

# 3. TypeScriptのビルド
echo "🔨 TypeScriptをビルド中..."
cd lambda/

echo "📦 Installing dependencies..."
npm install

echo "🔨 Compiling TypeScript..."
npm run build

if [ ! -f "dist/index.js" ]; then
  echo "❌ TypeScript compilation failed - index.js not found"
  exit 1
fi

# 4. デプロイメントパッケージの作成
echo "📦 デプロイメントパッケージを作成中..."
rm -f function.zip
# esbuildでバンドルされたファイルのみをzip化
# AWS SDKは外部依存として除外されているため、Lambda環境で利用可能
cd dist/
zip -r ../function.zip . -x "*.git*"
cd ../../  # プロジェクトルートに戻る

# 5. Lambda関数の作成/更新
echo "⚡ Lambda関数をデプロイ中..."

# 既存の関数があれば削除
aws lambda delete-function \
  --function-name $FUNCTION_NAME \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION 2>/dev/null || true

# Lambda関数の作成
aws lambda create-function \
  --function-name $FUNCTION_NAME \
  --runtime $RUNTIME \
  --role $LAMBDA_ROLE_ARN \
  --handler $HANDLER \
  --zip-file fileb://lambda/function.zip \
  --timeout 30 \
  --memory-size 256 \
  --environment Variables="{BUCKET_NAME=$BUCKET_NAME,AWS_REGION=$AWS_REGION,LOCALSTACK_ENDPOINT=$AWS_ENDPOINT_URL}" \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION

if [ $? -eq 0 ]; then
  echo "✅ Lambda関数のデプロイが成功しました!"
  
  # Lambda関数の準備完了を待つ
  echo "⏳ Lambda関数の準備完了を待機中..."
  
  # Lambda関数がActiveになるまで待機
  MAX_ATTEMPTS=30
  ATTEMPT=0
  
  while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    STATE=$(aws lambda get-function \
      --function-name $FUNCTION_NAME \
      --endpoint-url=$AWS_ENDPOINT_URL \
      --region $AWS_REGION \
      --query 'Configuration.State' \
      --output text 2>/dev/null)
    
    if [ "$STATE" = "Active" ]; then
      echo "✅ Lambda関数がアクティブになりました (状態: $STATE)"
      break
    elif [ "$STATE" = "Failed" ]; then
      echo "❌ Lambda関数の作成に失敗しました (状態: $STATE)"
      exit 1
    else
      echo "📋 Lambda関数の状態: $STATE (試行: $((ATTEMPT + 1))/$MAX_ATTEMPTS)"
      sleep 2
      ATTEMPT=$((ATTEMPT + 1))
    fi
  done
  
  if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo "❌ Lambda関数がアクティブになるまでの待機がタイムアウトしました"
    exit 1
  fi
  
  # テスト実行（統合ハンドラー対応）
  echo "🧪 CRUD統合ハンドラーのテスト実行中..."
  
  # 1. ファイルアップロードテスト（CREATE）
  echo "📤 CREATE: ファイルアップロードテスト..."
  
  # Base64エンコードでペイロードを準備
  echo '{"httpMethod":"POST","body":"{\"fileName\":\"deploy-test.txt\",\"content\":\"Deployed successfully!\\nTimestamp: '$(date -u)'\"}"}}' | base64 -w 0 > upload_payload.txt
  
  aws lambda invoke \
    --function-name $FUNCTION_NAME \
    --payload file://upload_payload.txt \
    upload_response.json \
    --endpoint-url=$AWS_ENDPOINT_URL \
    --region $AWS_REGION
  
  echo "📄 CREATE結果:"
  cat upload_response.json | jq .
  
  # 2. ファイル一覧取得テスト（READ - List）
  echo ""
  echo "📋 READ: ファイル一覧取得テスト..."
  
  echo '{"httpMethod":"GET"}' | base64 -w 0 > list_payload.txt
  
  aws lambda invoke \
    --function-name $FUNCTION_NAME \
    --payload file://list_payload.txt \
    list_response.json \
    --endpoint-url=$AWS_ENDPOINT_URL \
    --region $AWS_REGION
  
  echo "📄 READ (一覧)結果:"
  cat list_response.json | jq .
  
  # 3. 個別ファイル取得テスト（READ - Get）
  echo ""
  echo "📖 READ: 個別ファイル取得テスト..."
  
  echo '{"httpMethod":"GET","pathParameters":{"fileName":"deploy-test.txt"}}' | base64 -w 0 > get_payload.txt
  
  aws lambda invoke \
    --function-name $FUNCTION_NAME \
    --payload file://get_payload.txt \
    get_response.json \
    --endpoint-url=$AWS_ENDPOINT_URL \
    --region $AWS_REGION
  
  echo "📄 READ (個別)結果:"
  cat get_response.json | jq .
  
  # 4. S3バケットの直接確認
  echo ""
  echo "🔍 S3バケットの直接確認..."
  aws s3 ls s3://$BUCKET_NAME --recursive \
    --endpoint-url=$AWS_ENDPOINT_URL \
    --region $AWS_REGION
  
  # テスト用ファイルのクリーンアップ
  rm -f *_payload.txt *_response.json
  
else
  echo "❌ Lambda関数のデプロイに失敗しました"
  exit 1
fi

echo ""
echo "🎉 デプロイメント完了!"
echo "📋 作成されたリソース:"
echo "   • Lambda関数: $FUNCTION_NAME"
echo "   • S3バケット: $BUCKET_NAME"
echo "   • IAMロール: $ROLE_NAME"
echo ""
echo "🧪 CRUD操作テスト用コマンド例:"
echo ""
echo "   # CREATE (POST) - ファイルアップロード"
echo "   echo '{\"httpMethod\":\"POST\",\"body\":\"{\\\"fileName\\\":\\\"test.txt\\\",\\\"content\\\":\\\"Hello!\\\"}\"}}' | base64 -w 0 > payload.txt"
echo "   aws lambda invoke --function-name $FUNCTION_NAME --payload file://payload.txt response.json --endpoint-url=$AWS_ENDPOINT_URL"
echo ""
echo "   # READ (GET) - ファイル一覧"
echo "   echo '{\"httpMethod\":\"GET\"}' | base64 -w 0 > payload.txt"
echo "   aws lambda invoke --function-name $FUNCTION_NAME --payload file://payload.txt response.json --endpoint-url=$AWS_ENDPOINT_URL"
echo ""
echo "   # READ (GET) - 個別ファイル"
echo "   echo '{\"httpMethod\":\"GET\",\"pathParameters\":{\"fileName\":\"test.txt\"}}' | base64 -w 0 > payload.txt"
echo "   aws lambda invoke --function-name $FUNCTION_NAME --payload file://payload.txt response.json --endpoint-url=$AWS_ENDPOINT_URL"
echo ""
echo "   # UPDATE (PUT) - ファイル更新"
echo "   echo '{\"httpMethod\":\"PUT\",\"body\":\"{\\\"fileName\\\":\\\"test.txt\\\",\\\"content\\\":\\\"Updated!\\\"}\"}}' | base64 -w 0 > payload.txt"
echo "   aws lambda invoke --function-name $FUNCTION_NAME --payload file://payload.txt response.json --endpoint-url=$AWS_ENDPOINT_URL"
echo ""
echo "   # DELETE - ファイル削除"
echo "   echo '{\"httpMethod\":\"DELETE\",\"pathParameters\":{\"fileName\":\"test.txt\"}}' | base64 -w 0 > payload.txt"
echo "   aws lambda invoke --function-name $FUNCTION_NAME --payload file://payload.txt response.json --endpoint-url=$AWS_ENDPOINT_URL"
echo ""
echo "   # 結果確認"
echo "   cat response.json | jq ."
echo ""
echo "   # S3バケットの確認"
echo "   aws s3 ls s3://$BUCKET_NAME --recursive --endpoint-url=$AWS_ENDPOINT_URL"
echo ""
echo "   # 統合CRUDテストの実行"
echo "   ./scripts/crud-test.sh"