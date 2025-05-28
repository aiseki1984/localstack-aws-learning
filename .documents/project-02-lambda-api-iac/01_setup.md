# Lambda + API Gateway + IaC (Terraform)

Terraform で LocalStack に Lambda + API Gateway 構成を自動作成する方法

## 概要

project-01 で AWS CLI を使って手動で作成した Lambda + API Gateway 構成を、Terraform で IaC（Infrastructure as Code）化します。

- **Lambda 関数**: 2 つの数値を掛け算する計算機能
- **API Gateway**: REST API エンドポイント
- **IAM ロール**: Lambda 実行用の権限

## 前提条件

- LocalStack と localstack_client コンテナが起動済み
- Dockerfile で Terraform がインストール済み

## ステップ 1: プロジェクトディレクトリの作成

```bash
# コンテナにアクセス
docker compose exec localstack_client bash

# プロジェクトディレクトリを作成
mkdir -p workspace/project-02-terraform-lambda-api
cd workspace/project-02-terraform-lambda-api
```

## ステップ 2: Lambda 関数のソースコード作成

`index.js`を作成：

```javascript
exports.handler = async (event) => {
  let body = JSON.parse(event.body);
  const product = body.num1 * body.num2;
  const response = {
    statusCode: 200,
    body:
      'The product of ' + body.num1 + ' and ' + body.num2 + ' is ' + product,
  };
  return response;
};
```

## ステップ 3: Terraform メイン設定ファイル作成

`main.tf`を作成：

```hcl
# LocalStack用のprovider設定
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }
}

provider "aws" {
  region                      = "us-east-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  endpoints {
    lambda     = "http://localstack:4566"
    apigateway = "http://localstack:4566"
    iam        = "http://localstack:4566"
    sts        = "http://localstack:4566"
  }
}

# Lambda実行用のIAMロール
resource "aws_iam_role" "lambda_role" {
  name = "lambda-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Lambda基本実行ポリシーのアタッチ
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Lambdaファンクション用のZIPファイル
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "${path.module}/index.js"
  output_path = "${path.module}/function.zip"
}

# Lambda関数
resource "aws_lambda_function" "calc_function" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "terraform-calc-function"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic,
  ]
}

# API Gateway REST API
resource "aws_api_gateway_rest_api" "calc_api" {
  name        = "terraform-calc-api"
  description = "Calculator API created with Terraform"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# API Gatewayリソース (/calc)
resource "aws_api_gateway_resource" "calc_resource" {
  rest_api_id = aws_api_gateway_rest_api.calc_api.id
  parent_id   = aws_api_gateway_rest_api.calc_api.root_resource_id
  path_part   = "calc"
}

# API Gateway POSTメソッド
resource "aws_api_gateway_method" "calc_post" {
  rest_api_id   = aws_api_gateway_rest_api.calc_api.id
  resource_id   = aws_api_gateway_resource.calc_resource.id
  http_method   = "POST"
  authorization = "NONE"
}

# Lambda統合
resource "aws_api_gateway_integration" "lambda_integration" {
  rest_api_id             = aws_api_gateway_rest_api.calc_api.id
  resource_id             = aws_api_gateway_resource.calc_resource.id
  http_method             = aws_api_gateway_method.calc_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.calc_function.invoke_arn
}

# Lambda権限 (API Gatewayからの実行許可)
resource "aws_lambda_permission" "api_gateway_lambda" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.calc_function.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.calc_api.execution_arn}/*/*"
}

# API Gatewayデプロイメント
resource "aws_api_gateway_deployment" "calc_deployment" {
  depends_on = [
    aws_api_gateway_method.calc_post,
    aws_api_gateway_integration.lambda_integration,
  ]

  rest_api_id = aws_api_gateway_rest_api.calc_api.id
  stage_name  = "prod"
}

# 出力値
output "api_gateway_url" {
  description = "API Gateway endpoint URL"
  value       = "http://localstack:4566/restapis/${aws_api_gateway_rest_api.calc_api.id}/prod/_user_request_/calc"
}

output "lambda_function_name" {
  description = "Lambda function name"
  value       = aws_lambda_function.calc_function.function_name
}

output "api_gateway_id" {
  description = "API Gateway ID"
  value       = aws_api_gateway_rest_api.calc_api.id
}
```

## ステップ 4: .gitignore ファイルの作成

`.gitignore`を作成：

```
# Terraform files
.terraform/
.terraform.lock.hcl
terraform.tfstate
terraform.tfstate.backup

# Generated files
function.zip

# Logs
*.log
```

## ステップ 5: Terraform の初期化

```bash
terraform init
```

**期待される出力:**

```
Initializing the backend...
Initializing provider plugins...
- Installing hashicorp/archive v2.7.1...
- Installing hashicorp/aws v5.98.0...

Terraform has been successfully initialized!
```

## ステップ 6: プランの確認

```bash
terraform plan
```

**期待される出力:**

- 9 つのリソースが作成される予定が表示される
- IAM ロール、Lambda 関数、API Gateway 関連リソース

## ステップ 7: インフラストラクチャの適用

```bash
terraform apply -auto-approve
```

**期待される出力:**

```
Apply complete! Resources: 9 added, 0 changed, 0 destroyed.

Outputs:

api_gateway_id = "imnkws6bjd"
api_gateway_url = "http://localstack:4566/restapis/imnkws6bjd/prod/_user_request_/calc"
lambda_function_name = "terraform-calc-function"
```

## ステップ 8: 作成されたリソースの確認

### Lambda 関数の確認

```bash
aws lambda list-functions
```

### API Gateway の確認

```bash
aws apigateway get-rest-apis
```

### IAM ロールの確認

```bash
aws iam list-roles
```

## ステップ 9: API のテスト

```bash
# API Gateway IDを取得
API_ID=$(terraform output -raw api_gateway_id)

# APIをテスト
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"num1": "10", "num2": "10"}' \
  "http://localstack:4566/restapis/$API_ID/prod/_user_request_/calc"
```

**期待される結果:**

```
The product of 10 and 10 is 100
```

## ステップ 10: クリーンアップ（必要に応じて）

```bash
terraform destroy -auto-approve
```

## project-01 との比較

| 項目           | project-01 (CLI 手動) | project-02 (Terraform)    |
| -------------- | --------------------- | ------------------------- |
| 作成方法       | AWS CLI 手動実行      | `terraform apply`         |
| 再現性         | 手順書による          | コードによる              |
| バージョン管理 | ドキュメントのみ      | .tf ファイル              |
| 削除・再作成   | 手動削除が必要        | `terraform destroy/apply` |
| 設定変更       | CLI 再実行            | コード変更 + apply        |

## 作成されるリソース一覧

1. **aws_iam_role.lambda_role** - Lambda 実行用 IAM ロール
2. **aws_iam_role_policy_attachment.lambda_basic** - 基本実行ポリシーアタッチ
3. **aws_lambda_function.calc_function** - Lambda 関数
4. **aws_api_gateway_rest_api.calc_api** - REST API
5. **aws_api_gateway_resource.calc_resource** - API リソース (/calc)
6. **aws_api_gateway_method.calc_post** - POST メソッド
7. **aws_api_gateway_integration.lambda_integration** - Lambda 統合
8. **aws_lambda_permission.api_gateway_lambda** - 実行権限
9. **aws_api_gateway_deployment.calc_deployment** - デプロイメント

## LocalStack 特有の設定ポイント

### プロバイダー設定

- `endpoints`で LocalStack のエンドポイントを指定
- `skip_credentials_validation = true`で認証情報検証をスキップ
- テスト用のアクセスキー/シークレットキーを使用

### API エンドポイント URL

- LocalStack 形式: `http://localstack:4566/restapis/{api-id}/prod/_user_request_/{path}`
- 実際の AWS 形式: `https://{api-id}.execute-api.{region}.amazonaws.com/prod/{path}`

## トラブルシューティング

### archive provider エラー

```
Error: required by this configuration but no version is selected
```

**解決方法:** `terraform`ブロックに`archive`プロバイダーを追加

### 既存リソースの競合

**解決方法:** 既存リソースをクリーンアップしてから実行

### コンテナ間通信エラー

**解決方法:** LocalStack コンテナが起動していることを確認

## 次のステップ

1. **変数化**: `variables.tf`で設定を外部化
2. **環境分離**: `terraform.tfvars`で環境別設定
3. **モジュール化**: 再利用可能なモジュールに分割
4. **バックエンド設定**: 状態ファイルの管理方法改善

## 学習ポイント

✅ **IaC の利点を体験**

- 手動作業の自動化
- 設定の再現性確保
- バージョン管理による変更追跡

✅ **Terraform と LocalStack の連携**

- ローカル開発環境での AWS サービス利用
- クラウド費用をかけずに学習

✅ **依存関係の管理**

- Terraform が自動的にリソース作成順序を決定
- `depends_on`による明示的な依存関係指定
