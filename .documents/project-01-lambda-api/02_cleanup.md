# Lambda + API Gateway クリーンアップ手順

このドキュメントでは、ハンズオンで作成したリソースを削除する手順を説明します。

## 概要

削除対象のリソース：

1. API Gateway（REST API）
2. Lambda 関数
3. ローカルファイル（zip ファイルなど）

## 1. 現在のリソース確認

### Lambda 関数の確認

```bash
# すべての Lambda 関数を一覧表示
aws lambda list-functions

# 特定の関数の詳細確認
aws lambda get-function --function-name localstack-lambda-url-example
```

### API Gateway の確認

```bash
# すべての REST API を一覧表示
aws apigateway get-rest-apis

# 特定の API の詳細確認（API_ID は上記で取得）
API_ID=$(aws apigateway get-rest-apis --query 'items[?name==`LambdaAPI`].id' --output text)
echo "API ID: $API_ID"

aws apigateway get-rest-api --rest-api-id $API_ID

# API のリソース構造を確認
aws apigateway get-resources --rest-api-id $API_ID

# デプロイされたステージを確認
aws apigateway get-stages --rest-api-id $API_ID
```

### 現在のリソースを一括確認

```bash
echo "=== Current Resources ==="
echo ""
echo "Lambda Functions:"
aws lambda list-functions --query 'Functions[*].{Name:FunctionName,Runtime:Runtime,LastModified:LastModified}' --output table

echo ""
echo "API Gateways:"
aws apigateway get-rest-apis --query 'items[*].{Name:name,ID:id,CreatedDate:createdDate}' --output table
```

## 2. リソース削除手順

### ⚠️ 削除前の注意事項

- **削除は元に戻せません**
- 本番環境では必ずバックアップを取ってから実行
- LocalStack 環境なので、コンテナを再起動すればすべてリセットされます

### Step 1: API Gateway の削除

```bash
# API ID を取得
API_ID=$(aws apigateway get-rest-apis --query 'items[?name==`LambdaAPI`].id' --output text)

if [ -n "$API_ID" ]; then
    echo "Deleting API Gateway: $API_ID"

    # API Gateway を削除（関連するリソース、メソッド、デプロイメントもすべて削除される）
    aws apigateway delete-rest-api --rest-api-id $API_ID

    echo "API Gateway deleted successfully"
else
    echo "API Gateway 'LambdaAPI' not found"
fi
```

### Step 2: Lambda 関数の削除

```bash
# Lambda 関数の存在確認と削除
FUNCTION_NAME="localstack-lambda-url-example"

# 関数の存在確認
if aws lambda get-function --function-name $FUNCTION_NAME >/dev/null 2>&1; then
    echo "Deleting Lambda function: $FUNCTION_NAME"

    # Lambda 関数を削除
    aws lambda delete-function --function-name $FUNCTION_NAME

    echo "Lambda function deleted successfully"
else
    echo "Lambda function '$FUNCTION_NAME' not found"
fi
```

### Step 3: ローカルファイルの削除

```bash
# 作業ディレクトリの確認
pwd

# 作成したファイルを削除
echo "Cleaning up local files..."

# zip ファイルの削除
if [ -f "function.zip" ]; then
    rm function.zip
    echo "Deleted: function.zip"
fi

# index.js の削除（必要に応じて）
if [ -f "index.js" ]; then
    echo "index.js found. Delete it? (y/n)"
    read -r response
    if [ "$response" = "y" ] || [ "$response" = "Y" ]; then
        rm index.js
        echo "Deleted: index.js"
    fi
fi

# output.txt の削除
if [ -f "output.txt" ]; then
    rm output.txt
    echo "Deleted: output.txt"
fi

# function_urls.json の削除
if [ -f "function_urls.json" ]; then
    rm function_urls.json
    echo "Deleted: function_urls.json"
fi
```

## 3. 完全なクリーンアップスクリプト

すべてを一度に実行する場合：

```bash
#!/bin/bash

echo "=== Lambda + API Gateway Cleanup Script ==="
echo ""

# API Gateway の削除
echo "1. Deleting API Gateway..."
API_ID=$(aws apigateway get-rest-apis --query 'items[?name==`LambdaAPI`].id' --output text)

if [ -n "$API_ID" ] && [ "$API_ID" != "None" ]; then
    aws apigateway delete-rest-api --rest-api-id $API_ID
    echo "   ✅ API Gateway deleted: $API_ID"
else
    echo "   ℹ️  No API Gateway found to delete"
fi

# Lambda 関数の削除
echo ""
echo "2. Deleting Lambda function..."
FUNCTION_NAME="localstack-lambda-url-example"

if aws lambda get-function --function-name $FUNCTION_NAME >/dev/null 2>&1; then
    aws lambda delete-function --function-name $FUNCTION_NAME
    echo "   ✅ Lambda function deleted: $FUNCTION_NAME"
else
    echo "   ℹ️  No Lambda function found to delete"
fi

# ローカルファイルの削除
echo ""
echo "3. Cleaning up local files..."

for file in function.zip output.txt function_urls.json; do
    if [ -f "$file" ]; then
        rm "$file"
        echo "   ✅ Deleted: $file"
    fi
done

echo ""
echo "4. Verification..."
echo ""

# 削除確認
echo "Remaining Lambda functions:"
aws lambda list-functions --query 'Functions[*].FunctionName' --output text || echo "No Lambda functions"

echo ""
echo "Remaining API Gateways:"
aws apigateway get-rest-apis --query 'items[*].name' --output text || echo "No API Gateways"

echo ""
echo "🎉 Cleanup completed!"
```

## 4. 削除確認

削除後に以下のコマンドで確認：

```bash
# Lambda 関数がないことを確認
aws lambda list-functions --query 'Functions[*].FunctionName'

# API Gateway がないことを確認
aws apigateway get-rest-apis --query 'items[*].name'

# ローカルファイルの確認
ls -la *.zip *.txt *.json 2>/dev/null || echo "No cleanup files found"
```

## 5. LocalStack の完全リセット（最終手段）

もし何らかの理由で削除がうまくいかない場合：

```bash
# LocalStack コンテナの再起動（すべてのリソースがリセットされる）
docker-compose restart localstack

# または完全に停止して再開
docker-compose down
docker-compose up -d
```

## 6. トラブルシューティング

### よくあるエラー

1. **API Gateway が削除できない**

   ```bash
   # ステージが残っている場合
   aws apigateway get-stages --rest-api-id $API_ID
   aws apigateway delete-stage --rest-api-id $API_ID --stage-name prod
   ```

2. **Lambda 関数が削除できない**

   ```bash
   # 関数の詳細を確認
   aws lambda get-function --function-name localstack-lambda-url-example
   ```

3. **権限エラー**
   ```bash
   # LocalStack の環境変数を確認
   echo $AWS_ENDPOINT_URL
   echo $AWS_ACCESS_KEY_ID
   ```

## まとめ

このクリーンアップ手順により：

- ✅ API Gateway が削除される
- ✅ Lambda 関数が削除される
- ✅ ローカルファイルが削除される
- ✅ 環境がクリーンな状態に戻る

次回のハンズオンでは、クリーンな環境から再開できます！
