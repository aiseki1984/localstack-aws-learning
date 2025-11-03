#!/bin/bash

# Lambda + DynamoDB デプロイメントスクリプト (LocalStack用)

set -e

# 設定
FUNCTION_NAME="lambda-dynamodb-demo"
TABLE_NAME="users"
ROLE_NAME="lambda-execution-role"

echo "🚀 Lambda + DynamoDB デプロイメント開始"

# 1. DynamoDBテーブルの作成
echo "📊 DynamoDBテーブルを作成中..."
aws --endpoint-url=http://localhost:4566 dynamodb create-table \
  --table-name $TABLE_NAME \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1 || echo "テーブルは既に存在します"

# 2. IAMロールの作成
echo "🔐 IAMロールを作成中..."
aws --endpoint-url=http://localhost:4566 iam create-role \
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
  --region us-east-1 || echo "ロールは既に存在します"

# 3. TypeScriptのビルド
echo "🔨 TypeScriptをビルド中..."
npm run build

# 4. デプロイメントパッケージの作成
echo "📦 デプロイメントパッケージを作成中..."
rm -f function.zip
cd dist
zip -r ../function.zip .
cd ..
zip -r function.zip node_modules

# 5. Lambda関数の作成/更新
echo "⚡ Lambda関数をデプロイ中..."
aws --endpoint-url=http://localhost:4566 lambda create-function \
  --function-name $FUNCTION_NAME \
  --runtime nodejs18.x \
  --role arn:aws:iam::000000000000:role/$ROLE_NAME \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --environment Variables="{TABLE_NAME=$TABLE_NAME,AWS_REGION=us-east-1,LOCALSTACK_HOSTNAME=localhost}" \
  --region us-east-1 || \
aws --endpoint-url=http://localhost:4566 lambda update-function-code \
  --function-name $FUNCTION_NAME \
  --zip-file fileb://function.zip \
  --region us-east-1

echo "✅ デプロイメント完了!"
echo "🧪 テストコマンド例:"
echo "   POST: aws --endpoint-url=http://localhost:4566 lambda invoke --function-name $FUNCTION_NAME --payload '{\"httpMethod\":\"POST\",\"body\":\"{\\\"id\\\":\\\"test-1\\\",\\\"name\\\":\\\"Test User\\\",\\\"email\\\":\\\"test@example.com\\\"}\"}' response.json"
echo "   GET:  aws --endpoint-url=http://localhost:4566 lambda invoke --function-name $FUNCTION_NAME --payload '{\"httpMethod\":\"GET\",\"pathParameters\":{\"id\":\"test-1\"}}' response.json"