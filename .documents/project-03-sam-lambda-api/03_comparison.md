# SAM vs Terraform 比較分析

## 概要

本ドキュメントでは、同じ Lambda + API Gateway 構成を実現するために使用した SAM（project-03）と Terraform（project-02）の詳細比較を行います。

## 実装比較

### プロジェクト構造

#### SAM (project-03)

```
project-03-sam-lambda-api/
├── template.yaml          # SAMテンプレート (30行)
├── samconfig.toml         # デプロイ設定 (自動生成)
├── hello-world/
│   ├── app.mjs           # Lambda関数
│   ├── package.json      # Node.js依存関係
│   └── tests/            # テストファイル
└── events/
    └── event.json        # テストイベント
```

#### Terraform (project-02)

```
project-02-terraform-lambda-api/
├── main.tf               # Terraform設定 (80行)
├── index.js              # Lambda関数
├── function.zip          # Lambda配布パッケージ
├── terraform.tfstate     # 状態ファイル
└── terraform.tfstate.backup
```

### 設定ファイル比較

#### SAM template.yaml (30 行)

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: project-03-sam-lambda-api

Globals:
  Function:
    Timeout: 3

Resources:
  HelloWorldFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: hello-world/
      Handler: app.lambdaHandler
      Runtime: nodejs20.x
      Architectures:
        - x86_64
      Events:
        HelloWorld:
          Type: Api
          Properties:
            Path: /hello
            Method: get

Outputs:
  HelloWorldApi:
    Description: 'API Gateway endpoint URL'
    Value: !Sub 'https://${ServerlessRestApi}.execute-api.${AWS::Region}.amazonaws.com/Prod/hello/'
  HelloWorldFunction:
    Description: 'Hello World Lambda Function ARN'
    Value: !GetAtt HelloWorldFunction.Arn
  HelloWorldFunctionIamRole:
    Description: 'Implicit IAM Role created for Hello World function'
    Value: !GetAtt HelloWorldFunctionRole.Arn
```

#### Terraform main.tf (80 行)

```hcl
# データソース
data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
    actions = ["sts:AssumeRole"]
  }
}

# IAMロール
resource "aws_iam_role" "lambda_role" {
  name               = "lambda-execution-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.lambda_role.name
}

# Lambdaファイルのアーカイブ
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "index.js"
  output_path = "function.zip"
}

# Lambda関数
resource "aws_lambda_function" "calculator" {
  filename      = "function.zip"
  function_name = "calculator"
  role         = aws_iam_role.lambda_role.arn
  handler      = "index.handler"
  runtime      = "nodejs20.x"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
}

# API Gateway
resource "aws_api_gateway_rest_api" "calculator_api" {
  name        = "calculator-api"
  description = "API for calculator Lambda function"
}

resource "aws_api_gateway_resource" "calc_resource" {
  rest_api_id = aws_api_gateway_rest_api.calculator_api.id
  parent_id   = aws_api_gateway_rest_api.calculator_api.root_resource_id
  path_part   = "calc"
}

resource "aws_api_gateway_method" "calc_method" {
  rest_api_id   = aws_api_gateway_rest_api.calculator_api.id
  resource_id   = aws_api_gateway_resource.calc_resource.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "calc_integration" {
  rest_api_id = aws_api_gateway_rest_api.calculator_api.id
  resource_id = aws_api_gateway_resource.calc_resource.id
  http_method = aws_api_gateway_method.calc_method.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = aws_lambda_function.calculator.invoke_arn
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.calculator.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.calculator_api.execution_arn}/*/*"
}

# API Gateway デプロイメント
resource "aws_api_gateway_deployment" "calculator_deployment" {
  depends_on = [
    aws_api_gateway_method.calc_method,
    aws_api_gateway_integration.calc_integration,
  ]
  rest_api_id = aws_api_gateway_rest_api.calculator_api.id

  lifecycle {
    create_before_destroy = true
  }
}

# API Gateway ステージ
resource "aws_api_gateway_stage" "prod" {
  deployment_id = aws_api_gateway_deployment.calculator_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.calculator_api.id
  stage_name    = "prod"
}

# 出力値
output "api_gateway_url" {
  value = "http://localstack:4566/restapis/${aws_api_gateway_rest_api.calculator_api.id}/${aws_api_gateway_stage.prod.stage_name}/_user_request_/calc"
}

output "lambda_function_name" {
  value = aws_lambda_function.calculator.function_name
}
```

## 詳細比較表

### 1. 開発効率

| 項目                 | SAM                  | Terraform                | 備考                                 |
| -------------------- | -------------------- | ------------------------ | ------------------------------------ |
| **初期設定時間**     | 5 分                 | 15 分                    | SAM は`sam init`で即座にセットアップ |
| **設定ファイル行数** | 30 行                | 80 行                    | SAM は暗黙的設定が多い               |
| **必要な知識**       | SAM + CloudFormation | Terraform + AWS API      | SAM の方が学習コストが低い           |
| **コード補完**       | VS Code 拡張で充実   | VS Code 拡張で充実       | 両方とも良好                         |
| **ドキュメント**     | AWS 公式、豊富       | HashiCorp + コミュニティ | 両方とも充実                         |

### 2. リソース管理

| 項目                 | SAM            | Terraform           | 備考                                |
| -------------------- | -------------- | ------------------- | ----------------------------------- |
| **明示的定義**       | 1 個           | 9 個                | SAM は暗黙的に 6 個のリソースを作成 |
| **IAM 設定**         | 自動生成       | 手動定義            | SAM はベストプラクティスを自動適用  |
| **状態管理**         | CloudFormation | tfstate             | 両方とも状態を追跡                  |
| **リソース依存関係** | 自動解決       | 手動定義            | SAM の方が簡単                      |
| **リソース削除**     | `sam delete`   | `terraform destroy` | 両方とも安全                        |

### 3. 実際に作成される AWS リソース

#### SAM（暗黙的に作成される 6 個）

1. `AWS::Lambda::Function`: sam-app-desu-HelloWorldFunction-83dbe99b
2. `AWS::IAM::Role`: sam-app-desu-HelloWorldFunctionRole-8c7c35c4
3. `AWS::ApiGateway::RestApi`: 97kpcfv5ou
4. `AWS::ApiGateway::Deployment`: ServerlessRestApiDeployment47fc2d5f9d
5. `AWS::ApiGateway::Stage`: ServerlessRestApiProdStage
6. `AWS::Lambda::Permission`: HelloWorldFunctionHelloWorldPermissionProd

#### Terraform（明示的に定義した 9 個）

1. `aws_iam_role.lambda_role`
2. `aws_iam_role_policy_attachment.lambda_basic_execution`
3. `aws_lambda_function.calculator`
4. `aws_api_gateway_rest_api.calculator_api`
5. `aws_api_gateway_resource.calc_resource`
6. `aws_api_gateway_method.calc_method`
7. `aws_api_gateway_integration.calc_integration`
8. `aws_lambda_permission.api_gateway`
9. `aws_api_gateway_deployment.calculator_deployment`
10. `aws_api_gateway_stage.prod`

### 4. デプロイ・運用

| 項目             | SAM                   | Terraform         | 備考                   |
| ---------------- | --------------------- | ----------------- | ---------------------- |
| **初回デプロイ** | `sam deploy --guided` | `terraform apply` | SAM はインタラクティブ |
| **再デプロイ**   | `sam deploy`          | `terraform apply` | 両方とも差分適用       |
| **デプロイ時間** | 約 1 分               | 約 1 分 30 秒     | 大きな差はなし         |
| **ロールバック** | CloudFormation 標準   | 状態ファイル復元  | SAM の方が自動化       |
| **環境分離**     | samconfig.toml        | terraform.tfvars  | 両方とも対応           |

### 5. ローカル開発

| 項目               | SAM                   | Terraform      | 備考                 |
| ------------------ | --------------------- | -------------- | -------------------- |
| **ローカル実行**   | `sam local start-api` | 非対応         | SAM のみの機能       |
| **関数テスト**     | `sam local invoke`    | 非対応         | SAM のみの機能       |
| **ホットリロード** | 対応                  | 非対応         | SAM の大きな利点     |
| **デバッグ**       | VS Code 統合          | 外部ツール必要 | SAM の方が統合度高い |

### 6. 柔軟性・拡張性

| 項目                     | SAM                 | Terraform        | 備考                         |
| ------------------------ | ------------------- | ---------------- | ---------------------------- |
| **AWS サービス対応**     | サーバーレス特化    | 全サービス対応   | Terraform の方が幅広い       |
| **細かい設定**           | 制限あり            | 全項目設定可能   | Terraform の方が詳細制御可能 |
| **マルチクラウド**       | AWS 専用            | 対応             | Terraform のみ               |
| **カスタムリソース**     | CloudFormation 拡張 | プロバイダー拡張 | 両方とも拡張可能             |
| **既存リソース取り込み** | 限定的              | 充実             | Terraform の方が強力         |

## 実際の使用感

### SAM の利点

1. **学習コストが低い**: CloudFormation を知っていれば即座に理解可能
2. **記述量が少ない**: 30 行で完全な API 構成が可能
3. **ベストプラクティス**: IAM や API 設定が自動で最適化
4. **ローカル開発**: 本格的なローカル環境でテスト可能
5. **AWS 統合**: CloudFormation と完全統合

### SAM の欠点

1. **AWS 専用**: 他クラウドでは使用不可
2. **カスタマイズ制限**: 細かい設定変更が困難
3. **非サーバーレス**: EC2、RDS など従来リソースは不得意
4. **学習リソース**: Terraform ほど情報が豊富ではない

### Terraform の利点

1. **柔軟性**: 全 AWS リソースを詳細制御可能
2. **マルチクラウド**: AWS、Azure、GCP など対応
3. **成熟したエコシステム**: プロバイダー、モジュールが豊富
4. **企業採用**: 多くの企業で採用実績
5. **状態管理**: 高度な状態管理機能

### Terraform の欠点

1. **学習コスト**: HCL 言語、状態管理の概念が必要
2. **記述量**: 細かい設定まで全て明示的に記述
3. **AWS 統合**: ベストプラクティスを自分で実装
4. **ローカル開発**: 別途ツールが必要

## 使い分けの指針

### SAM を選ぶべきケース

- **サーバーレス中心**: Lambda、API Gateway、DynamoDB など
- **プロトタイプ開発**: 迅速な検証が必要
- **AWS 専用**: 他クラウドを使う予定がない
- **小〜中規模チーム**: 学習コストを抑えたい
- **ローカル開発重視**: 開発効率を最大化

```bash
# SAMが適している例
sam init --runtime nodejs20.x  # 即座にプロジェクト開始
sam local start-api            # ローカル開発環境
sam deploy                     # ワンコマンドデプロイ
```

### Terraform を選ぶべきケース

- **マルチクラウド**: AWS 以外も使用
- **大規模インフラ**: EC2、VPC、RDS など混在
- **細かい制御**: 詳細な設定が必要
- **企業標準**: 既存の Terraform 資産がある
- **DevOps チーム**: インフラ専門チームがある

```bash
# Terraformが適している例
terraform plan                 # 変更内容の詳細確認
terraform apply                # 精密な状態管理
terraform import               # 既存リソースの取り込み
```

## 実装時間比較

### 実際の作業時間（同じ機能を実装）

| フェーズ             | SAM              | Terraform        | 差分                       |
| -------------------- | ---------------- | ---------------- | -------------------------- |
| **学習時間**         | 30 分            | 2 時間           | SAM が 1.5 時間短縮        |
| **初期セットアップ** | 5 分             | 15 分            | SAM が 10 分短縮           |
| **設定作成**         | 15 分            | 45 分            | SAM が 30 分短縮           |
| **デプロイ**         | 1 分             | 1 分 30 秒       | SAM が 30 秒短縮           |
| **動作確認**         | 5 分             | 10 分            | SAM が 5 分短縮            |
| **ドキュメント作成** | 30 分            | 60 分            | SAM が 30 分短縮           |
| **合計**             | **1 時間 26 分** | **3 時間 31 分** | **SAM が 2 時間 5 分短縮** |

## まとめ

### 技術選択の結論

**サーバーレス中心の開発**: **SAM 推奨**

- 開発効率が圧倒的に高い
- AWS 統合が最適化済み
- ローカル開発環境が充実

**大規模・複合システム**: **Terraform 推奨**

- 全 AWS サービスに対応
- 細かい制御が可能
- マルチクラウド対応

**学習・プロトタイプ**: **SAM 推奨**

- 学習コストが低い
- 迅速な検証が可能
- 即座に結果を確認

**企業・Production**: **要件次第**

- サーバーレス中心 → SAM
- 従来インフラ中心 → Terraform
- ハイブリッド → 併用も検討

### 実際の選択基準

1. **チームのスキル**: SAM（低）vs Terraform（中〜高）
2. **システム規模**: 小〜中（SAM）vs 大（Terraform）
3. **開発速度**: 重視（SAM）vs 制御重視（Terraform）
4. **学習投資**: 最小化（SAM）vs 長期投資（Terraform）

両ツールとも優秀で、**適切な場面で使い分けることが重要**です。
