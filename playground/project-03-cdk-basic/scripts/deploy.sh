#!/bin/bash

# CDK スタックを CloudFormation で直接デプロイするスクリプト
set -e

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

STACK_NAME="Project03CdkBasicStack"
TEMPLATE_FILE="${PROJECT_ROOT}/cdk.out/Project03CdkBasicStack.template.json"
REGION="ap-northeast-1"
ENDPOINT_URL="http://localstack:4566"

echo "=========================================="
echo "CDK Stack Deployment via CloudFormation"
echo "=========================================="

# 1. Lambda のビルド
echo ""
echo "📦 Step 1: Building Lambda function..."
cd "${PROJECT_ROOT}/lambda"
npm run build

# 2. Lambda のコードを ZIP にパッケージング
echo ""
echo "📦 Step 2: Packaging Lambda code..."
cd "${PROJECT_ROOT}/lambda/dist"
zip -r lambda.zip .
mv lambda.zip "${SCRIPT_DIR}/"

# 3. S3 バケットの作成（Lambda コードアップロード用）
echo ""
echo "🪣 Step 3: Creating S3 bucket for Lambda code..."
BUCKET_NAME="cdk-lambda-deployment-bucket"
aws s3 mb s3://${BUCKET_NAME} \
  --endpoint-url=${ENDPOINT_URL} \
  --region=${REGION} 2>/dev/null || echo "Bucket already exists"

# 4. Lambda コードを S3 にアップロード
echo ""
echo "⬆️  Step 4: Uploading Lambda code to S3..."
aws s3 cp "${SCRIPT_DIR}/lambda.zip" s3://${BUCKET_NAME}/lambda.zip \
  --endpoint-url=${ENDPOINT_URL} \
  --region=${REGION}

# 5. CloudFormation テンプレートの生成
echo ""
echo "🔨 Step 5: Synthesizing CDK template..."
cd "${PROJECT_ROOT}"
npx cdk synth > /dev/null

# 6. テンプレートを修正（Lambda コードの場所を S3 に変更、Bootstrap パラメータを削除）
echo ""
echo "✏️  Step 6: Modifying template for S3 Lambda deployment..."
MODIFIED_TEMPLATE="${SCRIPT_DIR}/modified-template.json"

# テンプレートをコピーして以下を修正：
# 1. Lambda Code を S3 パスに変更
# 2. Parameters セクションから BootstrapVersion を削除
# 3. Rules セクションを削除（Bootstrap チェック用）
jq '
  # Lambda Code を S3 パスに変更
  .Resources |= with_entries(
    if .value.Type == "AWS::Lambda::Function" then
      .value.Properties.Code = {
        "S3Bucket": "'${BUCKET_NAME}'",
        "S3Key": "lambda.zip"
      }
    else
      .
    end
  ) |
  # Parameters から BootstrapVersion を削除
  if .Parameters then
    .Parameters |= del(.BootstrapVersion)
  else
    .
  end |
  # Rules セクションを削除
  del(.Rules)
' ${TEMPLATE_FILE} > ${MODIFIED_TEMPLATE}

# デバッグ: リソース数を確認
echo ""
echo "🔍 Template validation:"
RESOURCE_COUNT=$(jq '.Resources | length' ${MODIFIED_TEMPLATE})
echo "  - Total resources in template: ${RESOURCE_COUNT}"
jq -r '.Resources | keys[]' ${MODIFIED_TEMPLATE} | head -10

# 7. CloudFormation スタックのデプロイ
echo ""
echo "🚀 Step 7: Deploying CloudFormation stack..."
aws cloudformation deploy \
  --stack-name ${STACK_NAME} \
  --template-file ${MODIFIED_TEMPLATE} \
  --capabilities CAPABILITY_IAM \
  --endpoint-url=${ENDPOINT_URL} \
  --region=${REGION}

# 8. スタックの出力を表示
echo ""
echo "✅ Deployment completed!"
echo ""
echo "=========================================="
echo "Stack Outputs:"
echo "=========================================="
aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --endpoint-url=${ENDPOINT_URL} \
  --region=${REGION} \
  --query 'Stacks[0].Outputs' \
  --output json | jq .

# クリーンアップ（デバッグのためテンプレートは残す）
rm -f "${SCRIPT_DIR}/lambda.zip"
# rm -f ${MODIFIED_TEMPLATE}  # デバッグ用に残す

echo ""
echo "💡 Modified template saved as: ${MODIFIED_TEMPLATE}"
echo "🎉 Done!"
