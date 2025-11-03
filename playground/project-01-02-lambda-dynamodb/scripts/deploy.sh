#!/bin/bash

# Lambda + DynamoDB デプロイメントスクリプト (LocalStack用)

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
FUNCTION_NAME="lambda-dynamodb-demo"
TABLE_NAME="users"
ROLE_NAME="lambda-execution-role"
RUNTIME="nodejs20.x"  # Node.jsバージョンを指定可能
HANDLER="index.handler"

echo "🚀 Lambda + DynamoDB デプロイメント開始"
echo "📋 設定:"
echo "   Function: $FUNCTION_NAME"
echo "   Runtime: $RUNTIME"
echo "   Region: $AWS_REGION"
echo "   Endpoint: $AWS_ENDPOINT_URL"

# 1. DynamoDBテーブルの作成
echo "📊 DynamoDBテーブルを作成中..."
aws dynamodb create-table \
  --table-name $TABLE_NAME \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION || echo "テーブルは既に存在します"

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
  --environment Variables="{TABLE_NAME=$TABLE_NAME,AWS_REGION=$AWS_REGION,LOCALSTACK_HOSTNAME=localstack}" \
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
  
  # テスト実行
  echo "🧪 基本テストを実行中..."
  
  # POSTテスト
  echo "📤 POSTテスト..."
  # payloadをBase64エンコードして送信
  POST_PAYLOAD='{"httpMethod":"POST","body":"{\"id\":\"test-1\",\"name\":\"Test User\",\"email\":\"test@example.com\"}"}'
  POST_PAYLOAD_B64=$(echo "$POST_PAYLOAD" | base64 -w 0)
  
  aws lambda invoke \
    --function-name $FUNCTION_NAME \
    --payload "$POST_PAYLOAD_B64" \
    post_response.json \
    --endpoint-url=$AWS_ENDPOINT_URL \
    --region $AWS_REGION
  
  echo "📄 POST response:"
  cat post_response.json | jq .
  
  # GETテスト
  echo "📥 GETテスト..."
  # payloadをBase64エンコードして送信
  GET_PAYLOAD='{"httpMethod":"GET","pathParameters":{"id":"test-1"}}'
  GET_PAYLOAD_B64=$(echo "$GET_PAYLOAD" | base64 -w 0)
  
  aws lambda invoke \
    --function-name $FUNCTION_NAME \
    --payload "$GET_PAYLOAD_B64" \
    get_response.json \
    --endpoint-url=$AWS_ENDPOINT_URL \
    --region $AWS_REGION
  
  echo "📄 GET response:"
  cat get_response.json | jq .
  
  # クリーンアップ
  rm -f post_response.json get_response.json
  
else
  echo "❌ Lambda関数のデプロイに失敗しました"
  exit 1
fi

echo "🎉 デプロイメント完了!"