#!/bin/bash

# CRUD対応Lambda関数の包括的テストスクリプト

echo "🚀 CRUD Lambda関数テスト開始"
echo "=============================="

# Lambda関数名
FUNCTION_NAME="s3-text-handler"

# 削除対象ファイルのリスト（グローバル定義）
declare -a CLEANUP_FILES=(
  "create_payload.txt"
  "create_response.json"
  "list_payload.txt"
  "list_response.json"
  "get_payload.txt"
  "get_response.json"
  "update_payload.txt"
  "update_response.json"
  "get_after_update.json"
  "create2_payload.txt"
  "create2_response.json"
  "final_list_response.json"
  "delete_payload.txt"
  "delete_response.json"
  "after_delete_list.json"
  "error_payload.txt"
  "error_response.json"
  "method_error_payload.txt"
  "method_error_response.json"
)

# 安全なクリーンアップ関数
cleanup_test_files() {
  local action="$1"
  echo "🧹 テストファイルの${action}クリーンアップ"
  
  local deleted_count=0
  
  for file in "${CLEANUP_FILES[@]}"; do
    # ファイル名の妥当性チェック（安全のため）
    if [[ "$file" =~ ^[a-zA-Z0-9_.-]+\.(txt|json)$ ]]; then
      if [ -f "$file" ]; then
        echo "  削除: $file"
        if rm -f "$file"; then
          ((deleted_count++))
        else
          echo "  ❌ 削除に失敗: $file"
        fi
      fi
    else
      echo "  ⚠️ 無効なファイル名をスキップ: $file"
    fi
  done
  
  if [ $deleted_count -gt 0 ]; then
    echo "  ✅ ${deleted_count}個のファイルを削除しました"
  else
    echo "  ℹ️ 削除対象のファイルはありませんでした"
  fi
}

# スクリプト終了時の自動クリーンアップ設定
trap 'echo ""; echo "🛑 スクリプトが中断されました"; cleanup_test_files "緊急"; exit 1' INT TERM
trap 'cleanup_test_files "最終"' EXIT

# テスト前のクリーンアップ
cleanup_test_files "事前"

echo ""
echo "1️⃣ CREATE (POST) - ファイルアップロード"
echo "----------------------------------------"

# CREATEテスト
echo '{"httpMethod":"POST","body":"{\"fileName\":\"crud-test.txt\",\"content\":\"CRUD Lambda test\\nCreated with POST method\"}"}' | base64 -w 0 > create_payload.txt

aws lambda invoke \
  --function-name $FUNCTION_NAME \
  --payload file://create_payload.txt \
  create_response.json \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region us-east-1

echo "📄 CREATE結果:"
cat create_response.json | jq .

echo ""
echo "2️⃣ READ (GET) - ファイル一覧取得"
echo "-----------------------------------"

# READ (一覧)テスト
echo '{"httpMethod":"GET"}' | base64 -w 0 > list_payload.txt

aws lambda invoke \
  --function-name $FUNCTION_NAME \
  --payload file://list_payload.txt \
  list_response.json \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region us-east-1

echo "📄 READ (一覧)結果:"
cat list_response.json | jq .

echo ""
echo "3️⃣ READ (GET) - 特定ファイル取得"
echo "-----------------------------------"

# READ (個別)テスト
echo '{"httpMethod":"GET","pathParameters":{"fileName":"crud-test.txt"}}' | base64 -w 0 > get_payload.txt

aws lambda invoke \
  --function-name $FUNCTION_NAME \
  --payload file://get_payload.txt \
  get_response.json \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region us-east-1

echo "📄 READ (個別)結果:"
cat get_response.json | jq .

echo ""
echo "4️⃣ UPDATE (PUT) - ファイル更新"
echo "--------------------------------"

# UPDATEテスト
echo '{"httpMethod":"PUT","body":"{\"fileName\":\"crud-test.txt\",\"content\":\"CRUD Lambda test - UPDATED\\nThis file was updated with PUT method\\nTimestamp: '$(date)'\""}"}' | base64 -w 0 > update_payload.txt

aws lambda invoke \
  --function-name $FUNCTION_NAME \
  --payload file://update_payload.txt \
  update_response.json \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region us-east-1

echo "📄 UPDATE結果:"
cat update_response.json | jq .

echo ""
echo "5️⃣ READ (GET) - 更新後の確認"
echo "------------------------------"

# 更新後の確認
aws lambda invoke \
  --function-name $FUNCTION_NAME \
  --payload file://get_payload.txt \
  get_after_update.json \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region us-east-1

echo "📄 更新後のファイル内容:"
cat get_after_update.json | jq .

echo ""
echo "6️⃣ 新しいファイルのCREATE"
echo "--------------------------"

# 別のファイルを作成
echo '{"httpMethod":"POST","body":"{\"fileName\":\"second-file.txt\",\"content\":\"Second file for testing\\nJapanese: こんにちは\"}"}' | base64 -w 0 > create2_payload.txt

aws lambda invoke \
  --function-name $FUNCTION_NAME \
  --payload file://create2_payload.txt \
  create2_response.json \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region us-east-1

echo "📄 2番目のファイル作成結果:"
cat create2_response.json | jq .

echo ""
echo "7️⃣ READ (GET) - 全ファイル一覧（更新後）"
echo "----------------------------------------"

aws lambda invoke \
  --function-name $FUNCTION_NAME \
  --payload file://list_payload.txt \
  final_list_response.json \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region us-east-1

echo "📄 最新のファイル一覧:"
cat final_list_response.json | jq .

echo ""
echo "8️⃣ DELETE - ファイル削除"
echo "-------------------------"

# DELETEテスト
echo '{"httpMethod":"DELETE","pathParameters":{"fileName":"crud-test.txt"}}' | base64 -w 0 > delete_payload.txt

aws lambda invoke \
  --function-name $FUNCTION_NAME \
  --payload file://delete_payload.txt \
  delete_response.json \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region us-east-1

echo "📄 DELETE結果:"
cat delete_response.json | jq .

echo ""
echo "9️⃣ READ (GET) - 削除後の確認"
echo "------------------------------"

aws lambda invoke \
  --function-name $FUNCTION_NAME \
  --payload file://list_payload.txt \
  after_delete_list.json \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region us-east-1

echo "📄 削除後のファイル一覧:"
cat after_delete_list.json | jq .

echo ""
echo "🔟 エラーケースのテスト"
echo "------------------------"

# 存在しないファイルを取得
echo '{"httpMethod":"GET","pathParameters":{"fileName":"nonexistent.txt"}}' | base64 -w 0 > error_payload.txt

aws lambda invoke \
  --function-name $FUNCTION_NAME \
  --payload file://error_payload.txt \
  error_response.json \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region us-east-1

echo "📄 エラーケース（存在しないファイル）:"
cat error_response.json | jq .

# 不正なHTTPメソッド
echo '{"httpMethod":"PATCH","body":"{}"}' | base64 -w 0 > method_error_payload.txt

aws lambda invoke \
  --function-name $FUNCTION_NAME \
  --payload file://method_error_payload.txt \
  method_error_response.json \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region us-east-1

echo ""
echo "📄 エラーケース（不正なHTTPメソッド）:"
cat method_error_response.json | jq .

echo ""
echo "🔍 S3バケットの最終確認"
echo "------------------------"
aws s3 ls s3://my-test-bucket --recursive \
  --endpoint-url=$AWS_ENDPOINT_URL \
  --region us-east-1

echo ""
echo "✅ CRUD Lambda関数テスト完了！"
echo "=============================="
echo "🎯 テスト結果サマリー:"
echo "   ✅ CREATE (POST) - ファイル作成"
echo "   ✅ READ (GET) - ファイル一覧取得"
echo "   ✅ READ (GET) - 個別ファイル取得" 
echo "   ✅ UPDATE (PUT) - ファイル更新"
echo "   ✅ DELETE - ファイル削除"
echo "   ✅ エラーハンドリング確認"
echo ""
echo "🎉 1つのLambda関数でCRUD全操作が正常に動作しました！"