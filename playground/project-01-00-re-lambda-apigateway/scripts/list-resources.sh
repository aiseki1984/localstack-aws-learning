#!/bin/bash

# Lambda + API Gateway リソース確認スクリプト (LocalStack用)

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

echo "🔍 Lambda + API Gateway リソース確認"
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
  --query 'Functions[*].{Name:FunctionName,Runtime:Runtime,Handler:Handler,Size:CodeSize,LastModified:LastModified}' \
  --output table 2>/dev/null)

if [ $? -eq 0 ] && [ -n "$lambda_functions" ]; then
  echo "$lambda_functions"
  
  # 各Lambda関数の詳細情報
  echo ""
  echo "🔍 Lambda関数詳細:"
  function_names=$(aws lambda list-functions \
    --endpoint-url=$AWS_ENDPOINT_URL \
    --region $AWS_REGION \
    --query 'Functions[*].FunctionName' \
    --output text 2>/dev/null)
  
  if [ -n "$function_names" ]; then
    for func in $function_names; do
      echo "  📋 関数: $func"
      
      # 環境変数
      env_vars=$(aws lambda get-function-configuration \
        --function-name $func \
        --endpoint-url=$AWS_ENDPOINT_URL \
        --region $AWS_REGION \
        --query 'Environment.Variables' \
        --output json 2>/dev/null)
      
      if [ "$env_vars" != "null" ] && [ "$env_vars" != "{}" ]; then
        echo "    🌍 環境変数:"
        echo "$env_vars" | jq -r 'to_entries[] | "      \(.key): \(.value)"'
      else
        echo "    🌍 環境変数: なし"
      fi
      
      # トリガー情報（イベントソースマッピング）
      triggers=$(aws lambda list-event-source-mappings \
        --function-name $func \
        --endpoint-url=$AWS_ENDPOINT_URL \
        --region $AWS_REGION \
        --query 'EventSourceMappings[*].{UUID:UUID,EventSourceArn:EventSourceArn,State:State}' \
        --output json 2>/dev/null)
      
      if [ "$triggers" != "[]" ]; then
        echo "    🔗 トリガー:"
        echo "$triggers" | jq -r '.[] | "      📍 \(.EventSourceArn) (\(.State))"'
      else
        echo "    🔗 トリガー: なし"
      fi
      echo ""
    done
  fi
else
  echo "  📭 Lambda関数が見つかりません"
fi

# API Gatewayの確認
echo "🌐 API Gateway (REST API):"
rest_apis=$(aws apigateway get-rest-apis \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION \
  --query 'items[*].{Id:id,Name:name,Description:description,CreatedDate:createdDate}' \
  --output table 2>/dev/null)

if [ $? -eq 0 ] && [ -n "$rest_apis" ]; then
  echo "$rest_apis"
  
  # 各API Gatewayの詳細情報
  echo ""
  echo "🔍 API Gateway詳細:"
  api_ids=$(aws apigateway get-rest-apis \
    --endpoint-url=$AWS_ENDPOINT_URL \
    --region $AWS_REGION \
    --query 'items[*].id' \
    --output text 2>/dev/null)
  
  if [ -n "$api_ids" ]; then
    for api_id in $api_ids; do
      api_info=$(aws apigateway get-rest-api \
        --rest-api-id $api_id \
        --endpoint-url=$AWS_ENDPOINT_URL \
        --region $AWS_REGION \
        --output json 2>/dev/null)
      
      api_name=$(echo "$api_info" | jq -r '.name // "N/A"')
      api_description=$(echo "$api_info" | jq -r '.description // "説明なし"')
      
      echo "  📋 API: $api_name ($api_id)"
      echo "    📝 説明: $api_description"
      
      # リソース一覧
      echo "    🗂️ リソース:"
      resources=$(aws apigateway get-resources \
        --rest-api-id $api_id \
        --endpoint-url=$AWS_ENDPOINT_URL \
        --region $AWS_REGION \
        --query 'items[*].{Path:pathPart,FullPath:path,Id:id}' \
        --output json 2>/dev/null)
      
      if [ "$resources" != "[]" ]; then
        echo "$resources" | jq -r '.[] | "      📁 \(.FullPath // "/") (\(.Id))"'
        
        # 各リソースのメソッド確認
        resource_ids=$(echo "$resources" | jq -r '.[].Id')
        for resource_id in $resource_ids; do
          resource_path=$(echo "$resources" | jq -r ".[] | select(.Id==\"$resource_id\") | .FullPath // \"/\"")
          methods=$(aws apigateway get-resource \
            --rest-api-id $api_id \
            --resource-id $resource_id \
            --endpoint-url=$AWS_ENDPOINT_URL \
            --region $AWS_REGION \
            --query 'resourceMethods' \
            --output json 2>/dev/null)
          
          if [ "$methods" != "null" ] && [ "$methods" != "{}" ]; then
            method_list=$(echo "$methods" | jq -r 'keys[]' | tr '\n' ' ')
            echo "        🔗 メソッド ($resource_path): $method_list"
          fi
        done
      else
        echo "      📭 リソースなし"
      fi
      
      # デプロイメント確認
      echo "    🚀 デプロイメント:"
      deployments=$(aws apigateway get-deployments \
        --rest-api-id $api_id \
        --endpoint-url=$AWS_ENDPOINT_URL \
        --region $AWS_REGION \
        --query 'items[*].{Id:id,CreatedDate:createdDate,Description:description}' \
        --output json 2>/dev/null)
      
      if [ "$deployments" != "[]" ]; then
        echo "$deployments" | jq -r '.[] | "      📦 \(.Id) - \(.CreatedDate // "日時不明") (\(.Description // "説明なし"))"'
      else
        echo "      📭 デプロイメントなし"
      fi
      
      # ステージ確認
      echo "    🎭 ステージ:"
      stages=$(aws apigateway get-stages \
        --rest-api-id $api_id \
        --endpoint-url=$AWS_ENDPOINT_URL \
        --region $AWS_REGION \
        --query 'item[*].{Name:stageName,DeploymentId:deploymentId,CreatedDate:createdDate}' \
        --output json 2>/dev/null)
      
      if [ "$stages" != "[]" ]; then
        echo "$stages" | jq -r '.[] | "      🎪 \(.Name) (deployment: \(.DeploymentId // "なし"))"'
        
        # エンドポイントURL表示
        stage_names=$(echo "$stages" | jq -r '.[].Name')
        for stage in $stage_names; do
          echo "      🔗 URL: ${AWS_ENDPOINT_URL}/restapis/${api_id}/${stage}/_user_request_"
        done
      else
        echo "      📭 ステージなし"
      fi
      echo ""
    done
  fi
else
  echo "  📭 API Gatewayが見つかりません"
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
  
  # Lambda実行ロールの特定
  echo ""
  echo "🎯 Lambda実行ロール詳細:"
  role_names=$(aws iam list-roles \
    --endpoint-url=$AWS_ENDPOINT_URL \
    --region $AWS_REGION \
    --query 'Roles[*].RoleName' \
    --output text 2>/dev/null)
  
  if [ -n "$role_names" ]; then
    for role in $role_names; do
      # ロールの信頼ポリシー確認
      trust_policy=$(aws iam get-role \
        --role-name $role \
        --endpoint-url=$AWS_ENDPOINT_URL \
        --region $AWS_REGION \
        --query 'Role.AssumeRolePolicyDocument' \
        --output json 2>/dev/null)
      
      # Lambdaサービスを信頼するロールかチェック
      is_lambda_role=$(echo "$trust_policy" | jq -r '.Statement[]? | select(.Principal.Service? == "lambda.amazonaws.com") | .Effect' 2>/dev/null)
      
      if [ "$is_lambda_role" = "Allow" ]; then
        echo "  👤 Lambda実行ロール: $role"
        
        # アタッチされたポリシー
        policies=$(aws iam list-attached-role-policies \
          --role-name $role \
          --endpoint-url=$AWS_ENDPOINT_URL \
          --region $AWS_REGION \
          --query 'AttachedPolicies[*].PolicyName' \
          --output text 2>/dev/null)
        
        if [ -n "$policies" ]; then
          echo "    📋 アタッチポリシー: $policies"
        fi
        
        # インラインポリシー
        inline_policies=$(aws iam list-role-policies \
          --role-name $role \
          --endpoint-url=$AWS_ENDPOINT_URL \
          --region $AWS_REGION \
          --query 'PolicyNames' \
          --output text 2>/dev/null)
        
        if [ -n "$inline_policies" ]; then
          echo "    📄 インラインポリシー: $inline_policies"
        fi
      fi
    done
  fi
else
  echo "  📭 IAMロールが見つかりません"
fi
echo ""

# CloudWatch Logs確認
echo "📊 CloudWatch Logs:"
log_groups=$(aws logs describe-log-groups \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region $AWS_REGION \
  --query 'logGroups[*].{Name:logGroupName,CreationTime:creationTime,Size:storedBytes}' \
  --output table 2>/dev/null)

if [ $? -eq 0 ] && [ -n "$log_groups" ]; then
  echo "$log_groups"
else
  echo "  📭 CloudWatch Logsが見つかりません"
fi
echo ""

# サマリー情報
echo "📊 リソースサマリー:"
lambda_count=$(aws lambda list-functions --endpoint-url=$AWS_ENDPOINT_URL --region $AWS_REGION --query 'length(Functions)' --output text 2>/dev/null || echo "0")
api_count=$(aws apigateway get-rest-apis --endpoint-url=$AWS_ENDPOINT_URL --region $AWS_REGION --query 'length(items)' --output text 2>/dev/null || echo "0")
iam_count=$(aws iam list-roles --endpoint-url=$AWS_ENDPOINT_URL --region $AWS_REGION --query 'length(Roles)' --output text 2>/dev/null || echo "0")
log_count=$(aws logs describe-log-groups --endpoint-url=$AWS_ENDPOINT_URL --region $AWS_REGION --query 'length(logGroups)' --output text 2>/dev/null || echo "0")

echo "  ⚡ Lambda関数: ${lambda_count}個"
echo "  🌐 API Gateway: ${api_count}個"
echo "  🔐 IAMロール: ${iam_count}個"
echo "  📊 CloudWatch Logs: ${log_count}個"

echo ""
echo "🧹 リソースを削除したい場合:"
echo "   ./scripts/cleanup.sh - 個別削除"
echo "   docker-compose down && docker-compose up -d - LocalStack全体リセット"
echo ""
echo "🔄 再デプロイしたい場合:"
echo "   ./scripts/deploy.sh"
echo ""
echo "🧪 APIテストしたい場合:"
echo "   # 投稿一覧取得"
echo "   curl -X GET \"${AWS_ENDPOINT_URL}/restapis/{api-id}/{stage}/_user_request_/posts\""
echo "   # 新規投稿作成"
echo "   curl -X POST \"${AWS_ENDPOINT_URL}/restapis/{api-id}/{stage}/_user_request_/posts\" \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"title\":\"Test Post\",\"content\":\"Test Content\",\"author\":\"Test Author\"}'"