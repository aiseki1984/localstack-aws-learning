# Terraform Lambda + API Gateway プロジェクト

## 概要

Terraform で LocalStack に以下の構成を作成します：

- Lambda 関数（計算機能）
- API Gateway（REST API）
- IAM ロール

## 使用方法

### 1. コンテナにアクセス

```bash
docker compose exec localstack_client bash
```

### 2. プロジェクトディレクトリに移動

```bash
cd workspace/project-02-terraform-lambda-api
```

### 3. Terraform の初期化

```bash
terraform init
```

### 4. プランの確認

```bash
terraform plan
```

### 5. 適用

```bash
terraform apply
```

### 6. API のテスト

```bash
# API Gateway IDを確認（terraform applyの出力から取得）
API_ID=$(terraform output -raw api_gateway_id)

# APIをテスト
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"num1": "10", "num2": "10"}' \
  "http://localstack:4566/restapis/$API_ID/prod/_user_request_/calc"
```

### 7. クリーンアップ

```bash
terraform destroy
```

#### クリーンアップ確認

**Terraform での確認:**

```bash
# Terraform stateにリソースが残っていないことを確認
terraform state list
# 出力が空であればクリーンアップ完了

# プランでもリソースがないことを確認
terraform plan
# "No changes" が表示されればOK
```

**AWS CLI での確認:**

```bash
# Lambda関数の確認
aws lambda list-functions --endpoint-url=http://localstack:4566

# API Gatewayの確認
aws apigateway get-rest-apis --endpoint-url=http://localstack:4566

# IAMロールの確認
aws iam list-roles --endpoint-url=http://localstack:4566 --query 'Roles[?contains(RoleName, `lambda`)]'
```

**期待される結果:**

- Terraform state list: 空の出力
- Lambda functions: 空のリスト `{"Functions": []}`
- API Gateway: 空のリスト `{"items": []}`
- IAM roles: 空のリスト `[]`

## ファイル構成

- `main.tf` - Terraform メイン設定ファイル
- `index.js` - Lambda 関数のソースコード
- `README.md` - このファイル

## 期待される結果

API リクエストに対して以下のようなレスポンスが返されます：

```
The product of 10 and 10 is 100
```
