# Terraform 入門

## Terraform とは？

**Terraform**は、HashiCorp 社が開発したオープンソースの**Infrastructure as Code (IaC)** ツールです。

### 従来の方法 vs Terraform

| 従来の方法             | Terraform              |
| ---------------------- | ---------------------- |
| GUI で手動作成         | コードで定義           |
| 手順書による再現       | ファイルによる再現     |
| 変更履歴が不明         | Git で変更履歴管理     |
| 人的ミスが発生しやすい | 自動化により一貫性確保 |

### Infrastructure as Code (IaC) とは？

インフラストラクチャをコードとして管理する手法です：

- **宣言的**: 「どうやって作るか」ではなく「何を作りたいか」を記述
- **バージョン管理**: Git でインフラの変更履歴を管理
- **再現性**: 同じコードから同じ環境を何度でも作成可能
- **自動化**: 手動作業を排除し、人的ミスを防止

## Terraform の特徴

### 1. マルチクラウド対応

- AWS、Azure、GCP、Kubernetes など様々なプラットフォームに対応
- 同じツールで異なるクラウドを管理可能

### 2. 宣言的構文

```hcl
# 「Lambda関数を作りたい」と宣言するだけ
resource "aws_lambda_function" "my_function" {
  function_name = "my-function"
  runtime       = "nodejs18.x"
  handler       = "index.handler"
}
```

### 3. 状態管理

- **terraform.tfstate** ファイルでリソースの現在状態を管理
- 実際のインフラとコードの差分を検出

### 4. 実行計画

- 変更前に何が起こるかを確認可能
- 予期しない変更を防止

## Terraform の基本的な使い方・手順

### 1. 設定ファイル作成

```hcl
# main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

resource "aws_s3_bucket" "example" {
  bucket = "my-terraform-bucket"
}
```

### 2. 初期化

```bash
terraform init
```

- プロバイダーのダウンロード
- 作業ディレクトリの初期化

### 3. プラン確認

```bash
terraform plan
```

- 何が作成・変更・削除されるかを表示
- **実際の変更は行わない**

### 4. 適用

```bash
terraform apply
```

- プランを実際に実行
- インフラストラクチャを作成・変更

### 5. 削除（必要に応じて）

```bash
terraform destroy
```

- Terraform で管理しているリソースを削除

## 重要な用語解説

### プロバイダー (Provider)

- AWS、Azure、GCP などのクラウドプラットフォームとの接続を担当
- 各プラットフォーム固有の API を抽象化

```hcl
provider "aws" {
  region = "us-east-1"
}
```

### リソース (Resource)

- 作成・管理したいインフラストラクチャのコンポーネント
- Lambda 関数、S3 バケット、EC2 インスタンスなど

```hcl
resource "aws_lambda_function" "example" {
  # 設定内容
}
```

### データソース (Data Source)

- 既存のリソース情報を参照
- Terraform で管理していないリソースの情報を取得

```hcl
data "aws_caller_identity" "current" {}
```

### モジュール (Module)

- 再利用可能な Terraform コードの集合
- 複数のリソースを論理的にグループ化

### 状態ファイル (State File)

- **terraform.tfstate**: 現在のインフラストラクチャの状態を記録
- Terraform がリソースを追跡するために使用

### プラン (Plan)

- `terraform plan` コマンドで生成される実行計画
- 何が作成(+)、変更(~)、削除(-)されるかを表示

#### プランの読み方

```
Plan: 3 to add, 1 to change, 0 to destroy.

  + resource "aws_lambda_function" "calc_function" {  # 新規作成
  ~ resource "aws_s3_bucket" "example" {             # 変更
  - resource "aws_ec2_instance" "old" {              # 削除
```

### 依存関係 (Dependencies)

- リソース間の作成順序を Terraform が自動判定
- 明示的に指定する場合は `depends_on` を使用

```hcl
resource "aws_lambda_function" "example" {
  role = aws_iam_role.lambda_role.arn  # 暗黙的依存関係

  depends_on = [                       # 明示的依存関係
    aws_iam_role_policy_attachment.lambda_basic
  ]
}
```

## 今回のプロジェクトでの学習内容

### project-02-lambda-api-iac ステップ一覧

1. **[00_terraform.md](./00_terraform.md)** - Terraform 基本概念（このファイル）
2. **[00_setup.md](./00_setup.md)** - プロジェクト実行手順
3. **[01_execution_log.md](./01_execution_log.md)** - 実際の実行ログ

### 学習の流れ

#### ステップ 1: 環境準備

- LocalStack + Terraform 環境の確認
- プロジェクトディレクトリの作成

#### ステップ 2: コード作成

- `main.tf` - Terraform メイン設定
- `index.js` - Lambda 関数のソースコード
- `.gitignore` - Git 管理対象外ファイル

#### ステップ 3: Terraform 実行

```bash
terraform init    # 初期化
terraform plan     # プラン確認
terraform apply    # 適用
```

#### ステップ 4: 動作確認

```bash
# APIテスト
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"num1": "10", "num2": "10"}' \
  "http://localstack:4566/restapis/{api-id}/prod/_user_request_/calc"
```

#### ステップ 5: クリーンアップ

```bash
terraform destroy  # リソース削除
```

## 今回のプロジェクトで作成するリソース

### 構成図

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   API Gateway   │───▶│   Lambda関数     │───▶│   計算処理      │
│   (REST API)    │    │ (calc_function)  │    │ (num1 × num2)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │
         │                        ▼
         │               ┌──────────────────┐
         │               │    IAMロール     │
         └──────────────▶│ (lambda_role)    │
                         └──────────────────┘
```

### 作成される AWS リソース（9 個）

1. **aws_iam_role.lambda_role** - Lambda 実行用 IAM ロール
2. **aws_iam_role_policy_attachment.lambda_basic** - 基本実行ポリシー
3. **aws_lambda_function.calc_function** - Lambda 関数
4. **aws_api_gateway_rest_api.calc_api** - REST API
5. **aws_api_gateway_resource.calc_resource** - API リソース (/calc)
6. **aws_api_gateway_method.calc_post** - POST メソッド
7. **aws_api_gateway_integration.lambda_integration** - Lambda 統合
8. **aws_lambda_permission.api_gateway_lambda** - 実行権限
9. **aws_api_gateway_deployment.calc_deployment** - デプロイメント

## LocalStack 特有のポイント

### エンドポイント設定

```hcl
provider "aws" {
  endpoints {
    lambda     = "http://localstack:4566"
    apigateway = "http://localstack:4566"
    iam        = "http://localstack:4566"
    sts        = "http://localstack:4566"
  }
}
```

### 認証情報スキップ

```hcl
provider "aws" {
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true
}
```

### LocalStack 用 URL 形式

- **LocalStack**: `http://localstack:4566/restapis/{api-id}/prod/_user_request_/{path}`
- **実際の AWS**: `https://{api-id}.execute-api.{region}.amazonaws.com/prod/{path}`

## Terraform のメリット（今回のプロジェクトで体験）

### 1. 再現性

- `terraform apply` 一回で完全な環境を構築
- project-01 の手動手順（20 以上のコマンド）が自動化

### 2. 変更管理

- コードの変更履歴を Git で管理
- 何を変更したかが明確

### 3. 安全性

- `terraform plan` で事前に変更内容を確認
- 予期しない削除や変更を防止

### 4. 効率性

- 一度コードを書けば何度でも使用可能
- 環境の複製が簡単

## 次のステップ

1. **変数化** - `variables.tf` で設定を外部化
2. **環境分離** - dev/staging/prod 環境の管理
3. **モジュール化** - 再利用可能なコンポーネント作成
4. **リモートバックエンド** - チーム開発のための状態ファイル管理
5. **CI/CD 統合** - GitHubActions などとの連携

## 参考リンク

- [Terraform 公式ドキュメント](https://developer.hashicorp.com/terraform/docs)
- [AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [LocalStack](https://docs.localstack.cloud/)
- [Terraform Best Practices](https://www.terraform-best-practices.com/)

## Deprecated（非推奨）について

```
Warning: Argument is deprecated
stage_name is deprecated. Use the aws_api_gateway_stage resource instead.
```

### 今回のプロジェクトでの例

**現在の書き方（動作するが非推奨）:**

```hcl
resource "aws_api_gateway_deployment" "calc_deployment" {
  rest_api_id = aws_api_gateway_rest_api.calc_api.id
  stage_name  = "prod"  # ← この書き方が非推奨
}
```

**推奨される新しい書き方:**

```hcl
# デプロイメント（ステージ名なし）
resource "aws_api_gateway_deployment" "calc_deployment" {
  rest_api_id = aws_api_gateway_rest_api.calc_api.id

  depends_on = [
    aws_api_gateway_method.calc_post,
    aws_api_gateway_integration.lambda_integration,
  ]
}

# 別途ステージリソースを作成
resource "aws_api_gateway_stage" "prod" {
  deployment_id = aws_api_gateway_deployment.calc_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.calc_api.id
  stage_name    = "prod"
}
```

### なぜ分離されたのか？

1. **責任の分離**: デプロイメントとステージの管理を分ける
2. **柔軟性**: 同じデプロイメントから複数環境を作成可能
3. **設定の詳細化**: ステージ固有の設定（キャッシュ、変数など）

### 学習段階での対応

- **現在のコードで問題なし**: 動作するので修正不要
- **警告は学習の機会**: 新しい書き方を知るきっかけ
- **プロダクション移行時**: 推奨書き方に変更を検討
