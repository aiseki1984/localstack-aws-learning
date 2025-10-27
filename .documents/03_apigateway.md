# AWS API Gateway - よく使うコマンド集

## 概要

Amazon API Gateway は、REST API や WebSocket API を作成、デプロイ、管理するためのフルマネージドサービスです。このドキュメントでは、LocalStack 環境での API Gateway の基本的な操作と頻繁に使用されるコマンドをまとめています。

## API Gateway の階層構造

API Gateway は階層構造を持っています。`create-rest-api` は API 全体の枠組みを作り、その下にリソースやメソッドを段階的に構築していきます。

### 構造の概要

```
REST API (create-rest-api で作成)
└── Root Resource (/) - 自動作成される
    ├── Child Resource (/users) - 手動で作成
    │   ├── Method (GET) - 手動で作成
    │   │   └── Integration (Lambda統合など) - 手動で設定
    │   └── Method (POST) - 手動で作成
    │       └── Integration (Lambda統合など) - 手動で設定
    └── Child Resource (/calc) - 手動で作成
        └── Method (POST) - 手動で作成
            └── Integration (Lambda統合など) - 手動で設定
```

### 各要素の説明

| 要素                  | 説明                                  | 作成方法          |
| --------------------- | ------------------------------------- | ----------------- |
| **REST API**          | API 全体の枠組み                      | `create-rest-api` |
| **Root Resource (/)** | ルートパス、自動作成                  | 自動              |
| **Child Resource**    | 具体的なパス (`/users`, `/calc` など) | `create-resource` |
| **Method**            | HTTP メソッド (`GET`, `POST` など)    | `put-method`      |
| **Integration**       | バックエンドとの連携設定              | `put-integration` |

### 変数の役割

```bash
# API_ID: REST API全体のID
API_ID=$(aws apigateway get-rest-apis --query 'items[?name==`LambdaAPI`].id' --output text)

# PARENT_ID: 新しいリソースの親となるリソースのID
# 通常はルートリソース (/) のIDを指定
PARENT_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query 'items[0].id' --output text)

# RESOURCE_ID: 作成されたリソースのID（メソッド追加時に使用）
RESOURCE_ID=$(aws apigateway get-resources \
    --rest-api-id $API_ID \
    --query 'items[?path==`/calc`].id' \
    --output text)
```

### なぜ階層構造なのか？

1. **親子関係の管理**: 新しいリソースを作る際に、どのリソースの下に作るかを明確にする
2. **パスの構築**: `/users/{id}/orders` のような複雑なパスを段階的に構築
3. **権限管理**: 階層ごとに異なる認証・認可設定が可能
4. **メンテナンス性**: 構造が明確で管理しやすい

### 複雑なパスの例

`/users/{id}/orders` を作成する場合：

```bash
# 1. /users を作成 (親: /)
USERS_ID=$(aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $ROOT_ID \
    --path-part 'users' \
    --query 'id' --output text)

# 2. /users/{id} を作成 (親: /users)
USER_ID_ID=$(aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $USERS_ID \
    --path-part '{id}' \
    --query 'id' --output text)

# 3. /users/{id}/orders を作成 (親: /users/{id})
ORDERS_ID=$(aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $USER_ID_ID \
    --path-part 'orders' \
    --query 'id' --output text)
```

## 基本設定

### LocalStack 用の AWS CLI 設定

```bash
# LocalStack用エンドポイント設定
export AWS_ENDPOINT_URL=http://localhost:4566
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1

# または各コマンドで指定
aws --endpoint-url=http://localhost:4566 apigateway [command]
```

## 1. REST API の基本操作

### REST API の作成

```bash
# 新しい REST API を作成
aws apigateway create-rest-api \
    --name "my-api" \
    --description "My first API"

# レスポンス例
{
    "id": "abc123def4",
    "name": "my-api",
    "description": "My first API",
    "createdDate": 1625097600,
    "apiKeySource": "HEADER",
    "endpointConfiguration": {
        "types": ["EDGE"]
    }
}
```

### REST API の一覧取得

```bash
# すべての REST API を取得
aws apigateway get-rest-apis

# 特定の API の詳細を取得
aws apigateway get-rest-api --rest-api-id abc123def4
```

### REST API の削除

```bash
# REST API を削除
aws apigateway delete-rest-api --rest-api-id abc123def4
```

## 2. リソースとメソッドの管理

### リソースの一覧取得

```bash
# API のリソース一覧を取得
aws apigateway get-resources --rest-api-id abc123def4

# ルートリソースの ID を取得（よく使う）
aws apigateway get-resources --rest-api-id abc123def4 \
    --query 'items[?path==`/`].id' --output text
```

### リソースの作成

```bash
# 新しいリソースを作成
aws apigateway create-resource \
    --rest-api-id abc123def4 \
    --parent-id xyz789abc \
    --path-part "users"

# 動的パスパラメータを含むリソース
aws apigateway create-resource \
    --rest-api-id abc123def4 \
    --parent-id xyz789abc \
    --path-part "{id}"
```

### メソッドの作成

```bash
# GET メソッドを追加
aws apigateway put-method \
    --rest-api-id abc123def4 \
    --resource-id def456ghi \
    --http-method GET \
    --authorization-type NONE

# POST メソッドを追加（認証あり）
aws apigateway put-method \
    --rest-api-id abc123def4 \
    --resource-id def456ghi \
    --http-method POST \
    --authorization-type AWS_IAM
```

## 3. 統合（Integration）の設定

### Lambda 統合の設定

```bash
# Lambda プロキシ統合
aws apigateway put-integration \
    --rest-api-id abc123def4 \
    --resource-id def456ghi \
    --http-method GET \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:123456789012:function:my-function/invocations"

# Lambda 非プロキシ統合
aws apigateway put-integration \
    --rest-api-id abc123def4 \
    --resource-id def456ghi \
    --http-method POST \
    --type AWS \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:123456789012:function:my-function/invocations"
```

### HTTP 統合の設定

```bash
# HTTP プロキシ統合
aws apigateway put-integration \
    --rest-api-id abc123def4 \
    --resource-id def456ghi \
    --http-method GET \
    --type HTTP_PROXY \
    --integration-http-method GET \
    --uri "https://example.com/api"

# HTTP 統合（非プロキシ）
aws apigateway put-integration \
    --rest-api-id abc123def4 \
    --resource-id def456ghi \
    --http-method POST \
    --type HTTP \
    --integration-http-method POST \
    --uri "https://example.com/api/users"
```

### Mock 統合の設定

```bash
# Mock 統合（テスト用）
aws apigateway put-integration \
    --rest-api-id abc123def4 \
    --resource-id def456ghi \
    --http-method GET \
    --type MOCK \
    --request-templates '{"application/json": "{\"statusCode\": 200}"}'
```

## 4. レスポンスとモデルの設定

### メソッドレスポンスの設定

```bash
# 200 OK レスポンスを設定
aws apigateway put-method-response \
    --rest-api-id abc123def4 \
    --resource-id def456ghi \
    --http-method GET \
    --status-code 200 \
    --response-models '{"application/json": "Empty"}'

# エラーレスポンスを設定
aws apigateway put-method-response \
    --rest-api-id abc123def4 \
    --resource-id def456ghi \
    --http-method GET \
    --status-code 400 \
    --response-models '{"application/json": "Error"}'
```

### 統合レスポンスの設定

```bash
# 統合レスポンスを設定
aws apigateway put-integration-response \
    --rest-api-id abc123def4 \
    --resource-id def456ghi \
    --http-method GET \
    --status-code 200 \
    --response-templates '{"application/json": ""}'
```

## 5. デプロイメント

API Gateway では、リソースやメソッドを作成しただけでは外部からアクセスできません。**デプロイメント**は、設定した API を実際に使用可能な状態にする作業です。

### デプロイメントの概念

```
API 設定 → デプロイメント → ステージ → 実際のエンドポイント
   ↓           ↓           ↓           ↓
設計図    →   実装    →   環境    →  アクセス可能
```

| 要素               | 説明                                          |
| ------------------ | --------------------------------------------- |
| **API 設定**       | リソース、メソッド、統合の設定（設計図）      |
| **デプロイメント** | 設定をスナップショットとして固定              |
| **ステージ**       | デプロイされた環境（dev, staging, prod など） |
| **エンドポイント** | 実際にアクセス可能な URL                      |

### なぜデプロイメントが必要？

1. **変更の適用**: API 設定を変更しただけでは反映されない
2. **環境の分離**: dev/staging/prod などの環境ごとに管理
3. **ロールバック**: 問題があった場合に前のバージョンに戻せる
4. **バージョン管理**: 複数のバージョンを同時に運用可能

### ステージの作成とデプロイ

```bash
# API をデプロイ
aws apigateway create-deployment \
    --rest-api-id abc123def4 \
    --stage-name dev \
    --stage-description "Development stage" \
    --description "First deployment"

# 既存ステージへのデプロイ
aws apigateway create-deployment \
    --rest-api-id abc123def4 \
    --stage-name prod
```

### ステージの管理

```bash
# ステージ一覧を取得
aws apigateway get-stages --rest-api-id abc123def4

# ステージの詳細を取得
aws apigateway get-stage \
    --rest-api-id abc123def4 \
    --stage-name dev

# ステージを削除
aws apigateway delete-stage \
    --rest-api-id abc123def4 \
    --stage-name dev
```

## 6. API キーとクォータ

### API キーの管理

```bash
# API キーを作成
aws apigateway create-api-key \
    --name "my-api-key" \
    --description "API key for my application" \
    --enabled

# API キー一覧を取得
aws apigateway get-api-keys

# API キーを削除
aws apigateway delete-api-key --api-key 1234567890
```

### 使用プランの設定

```bash
# 使用プランを作成
aws apigateway create-usage-plan \
    --name "basic-plan" \
    --description "Basic usage plan" \
    --throttle burstLimit=100,rateLimit=50 \
    --quota limit=10000,period=MONTH \
    --api-stages apiId=abc123def4,stage=prod

# API キーを使用プランに関連付け
aws apigateway create-usage-plan-key \
    --usage-plan-id ghi789jkl \
    --key-id 1234567890 \
    --key-type API_KEY
```

## 7. ログとモニタリング

### CloudWatch ログの有効化

```bash
# ステージレベルでログを有効化
aws apigateway update-stage \
    --rest-api-id abc123def4 \
    --stage-name dev \
    --patch-ops op=replace,path=/accessLogSettings/destinationArn,value=arn:aws:logs:us-east-1:123456789012:log-group:api-gateway-logs
```

### X-Ray トレースの有効化

```bash
# X-Ray トレースを有効化
aws apigateway update-stage \
    --rest-api-id abc123def4 \
    --stage-name dev \
    --patch-ops op=replace,path=/tracingConfig/tracingEnabled,value=true
```

## 8. CORS の設定

### OPTIONS メソッドの追加（CORS 用）

```bash
# OPTIONS メソッドを追加
aws apigateway put-method \
    --rest-api-id abc123def4 \
    --resource-id def456ghi \
    --http-method OPTIONS \
    --authorization-type NONE

# CORS 統合を設定
aws apigateway put-integration \
    --rest-api-id abc123def4 \
    --resource-id def456ghi \
    --http-method OPTIONS \
    --type MOCK \
    --request-templates '{"application/json": "{\"statusCode\": 200}"}'

# CORS レスポンスヘッダーを設定
aws apigateway put-method-response \
    --rest-api-id abc123def4 \
    --resource-id def456ghi \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters method.response.header.Access-Control-Allow-Origin=true,method.response.header.Access-Control-Allow-Methods=true,method.response.header.Access-Control-Allow-Headers=true

aws apigateway put-integration-response \
    --rest-api-id abc123def4 \
    --resource-id def456ghi \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters method.response.header.Access-Control-Allow-Origin="'*'",method.response.header.Access-Control-Allow-Methods="'GET,POST,PUT,DELETE,OPTIONS'",method.response.header.Access-Control-Allow-Headers="'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
```

## 9. テストとデバッグ

### API のテスト

```bash
# メソッドをテスト
aws apigateway test-invoke-method \
    --rest-api-id abc123def4 \
    --resource-id def456ghi \
    --http-method GET \
    --path-with-query-string "/users?limit=10"

# POST リクエストのテスト
aws apigateway test-invoke-method \
    --rest-api-id abc123def4 \
    --resource-id def456ghi \
    --http-method POST \
    --body '{"name": "John", "email": "john@example.com"}'
```

### 実際の API エンドポイントのテスト

```bash
# LocalStack での API エンドポイント
# 形式: http://localhost:4566/restapis/{api-id}/{stage}/_user_request_/{resource-path}

# GET リクエスト
curl "http://localhost:4566/restapis/abc123def4/dev/_user_request_/users"

# POST リクエスト
curl -X POST "http://localhost:4566/restapis/abc123def4/dev/_user_request_/users" \
    -H "Content-Type: application/json" \
    -d '{"name": "John", "email": "john@example.com"}'
```

## 10. よく使う組み合わせコマンド

### 完全な API セットアップ（シェルスクリプト例）

```bash
#!/bin/bash
API_NAME="my-test-api"
ENDPOINT_URL="http://localhost:4566"

# 1. REST API を作成
API_ID=$(aws apigateway create-rest-api --name "$API_NAME" \
    --endpoint-url "$ENDPOINT_URL" \
    --query 'id' --output text)

echo "Created API: $API_ID"

# 2. ルートリソース ID を取得
ROOT_ID=$(aws apigateway get-resources --rest-api-id "$API_ID" \
    --endpoint-url "$ENDPOINT_URL" \
    --query 'items[?path==`/`].id' --output text)

# 3. /users リソースを作成
USERS_RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id "$API_ID" \
    --parent-id "$ROOT_ID" \
    --path-part "users" \
    --endpoint-url "$ENDPOINT_URL" \
    --query 'id' --output text)

# 4. GET メソッドを追加
aws apigateway put-method \
    --rest-api-id "$API_ID" \
    --resource-id "$USERS_RESOURCE_ID" \
    --http-method GET \
    --authorization-type NONE \
    --endpoint-url "$ENDPOINT_URL"

# 5. Mock 統合を設定
aws apigateway put-integration \
    --rest-api-id "$API_ID" \
    --resource-id "$USERS_RESOURCE_ID" \
    --http-method GET \
    --type MOCK \
    --request-templates '{"application/json": "{\"statusCode\": 200}"}' \
    --endpoint-url "$ENDPOINT_URL"

# 6. メソッドレスポンスを設定
aws apigateway put-method-response \
    --rest-api-id "$API_ID" \
    --resource-id "$USERS_RESOURCE_ID" \
    --http-method GET \
    --status-code 200 \
    --endpoint-url "$ENDPOINT_URL"

# 7. 統合レスポンスを設定
aws apigateway put-integration-response \
    --rest-api-id "$API_ID" \
    --resource-id "$USERS_RESOURCE_ID" \
    --http-method GET \
    --status-code 200 \
    --response-templates '{"application/json": "[{\"id\": 1, \"name\": \"John Doe\"}, {\"id\": 2, \"name\": \"Jane Smith\"}]"}' \
    --endpoint-url "$ENDPOINT_URL"

# 8. API をデプロイ
aws apigateway create-deployment \
    --rest-api-id "$API_ID" \
    --stage-name dev \
    --endpoint-url "$ENDPOINT_URL"

echo "API deployed! Test with:"
echo "curl http://localhost:4566/restapis/$API_ID/dev/_user_request_/users"
```

## 11. 便利なヘルパーコマンド

### API 情報の一括取得

```bash
# すべての API とその詳細を取得
for api_id in $(aws apigateway get-rest-apis --query 'items[].id' --output text); do
    echo "=== API: $api_id ==="
    aws apigateway get-rest-api --rest-api-id $api_id
    echo ""
done
```

### リソース構造の可視化

```bash
# API のリソース構造を表示
aws apigateway get-resources --rest-api-id abc123def4 \
    --query 'items[].{Path:path,Methods:resourceMethods}' \
    --output table
```

### エラーチェック用

```bash
# デプロイされていない API を確認
aws apigateway get-rest-apis --query 'items[?!contains(keys(@), `stages`)]'
```

## まとめ

API Gateway でよく使用される操作：

1. **API の作成・削除**: `create-rest-api`, `delete-rest-api`
2. **リソース管理**: `create-resource`, `get-resources`
3. **メソッド設定**: `put-method`, `put-integration`
4. **デプロイメント**: `create-deployment`, `get-stages`
5. **テスト**: `test-invoke-method`, curl でのテスト
6. **CORS 設定**: OPTIONS メソッドとヘッダー設定
7. **監視・ログ**: CloudWatch と X-Ray の設定

LocalStack 環境では、必ず `--endpoint-url=http://localhost:4566` を指定することを忘れずに！

## 関連ドキュメント

- [AWS CLI S3 コマンド集](./02_cli_s3.md)
- [LocalStack 基本設定](./01_localstack_basics.md)
