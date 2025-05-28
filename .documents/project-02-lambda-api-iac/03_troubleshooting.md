# Terraform API Gateway Stage エラーのトラブルシューティング

## 概要

Terraform 設定で deprecated warning（`stage_name`パラメータ）を修正する際に発生した、API Gateway Stage リソースの競合エラーとその解決手順について説明します。

## 発生したエラー

### 1. 問題の発端

**Deprecated Warning:**

```
Warning: Argument is deprecated
│   with aws_api_gateway_deployment.calc_deployment,
│   on main.tf line 125, in resource "aws_api_gateway_deployment" "calc_deployment":
│  125:   stage_name  = "prod"
│
│ Use the aws_api_gateway_stage resource instead
```

### 2. 修正内容

**修正前（deprecated）:**

```hcl
resource "aws_api_gateway_deployment" "calc_deployment" {
  depends_on = [
    aws_api_gateway_method.calc_post,
    aws_api_gateway_integration.lambda_integration,
  ]
  rest_api_id = aws_api_gateway_rest_api.calc_api.id
  stage_name  = "prod"  # ← deprecated
}
```

**修正後（best practice）:**

```hcl
resource "aws_api_gateway_deployment" "calc_deployment" {
  depends_on = [
    aws_api_gateway_method.calc_post,
    aws_api_gateway_integration.lambda_integration,
  ]
  rest_api_id = aws_api_gateway_rest_api.calc_api.id

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "calc_stage" {
  deployment_id = aws_api_gateway_deployment.calc_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.calc_api.id
  stage_name    = "prod"
}
```

### 3. エラーの発生

`terraform apply`実行時に以下のエラーが発生：

```
Error: creating API Gateway Stage (prod): operation error API Gateway: CreateStage,
https response error StatusCode: 409, RequestID: abfc0a9b-f63e-4081-a743-73c69127ac42,
ConflictException: Stage already exists
```

## なぜエラーが発生したのか？

### 根本原因の分析

1. **既存リソースの状態**

   - 以前の`aws_api_gateway_deployment`で`stage_name = "prod"`により、すでに"prod"ステージが作成されていた
   - LocalStack 内に物理的な API Gateway Stage リソースが存在していた

2. **Terraform State の不整合**

   - 新しい`aws_api_gateway_stage`リソースは Terraform state 内に存在しない
   - しかし、実際の AWS リソース（LocalStack）には同じ名前の stage が既に存在
   - Terraform は新規作成を試みるが、競合により失敗

3. **なぜ destroy しなかったのか？**
   - **いいえ、destroy は必要ありませんでした**
   - より適切な解決方法は`terraform import`による既存リソースの取り込み
   - destroy は既存のインフラを破壊するため、本番環境では避けるべき

## トラブルシューティング手順

### Step 1: 現状確認

```bash
# Terraform state内のリソース一覧を確認
terraform state list
```

**出力例:**

```
data.archive_file.lambda_zip
aws_api_gateway_deployment.calc_deployment
aws_api_gateway_integration.lambda_integration
aws_api_gateway_method.calc_post
aws_api_gateway_resource.calc_resource
aws_api_gateway_rest_api.calc_api
aws_iam_role.lambda_role
aws_iam_role_policy_attachment.lambda_basic
aws_lambda_function.calc_function
aws_lambda_permission.api_gateway_lambda
```

**観察結果:**

- `aws_api_gateway_stage.calc_stage`が state 内に存在しない
- しかし実際の AWS 環境には"prod"ステージが存在

### Step 2: 解決方法の選択

**選択肢:**

1. **terraform destroy + apply（非推奨）**

   - 全インフラを破壊して再作成
   - ダウンタイムが発生
   - 本番環境では危険

2. **terraform import（推奨）** ✅

   - 既存リソースを Terraform 管理下に取り込み
   - ダウンタイムなし
   - 安全な方法

3. **手動リソース削除（複雑）**

   - AWS CLI で該当ステージを手動削除
   - Terraform の管理外操作で推奨しない

### Step 3: Terraform Import 実行

Terraform Import とは、既存のインフラリソースを Terraform の管理下に取り込むための機能です。これにより、手動で作成されたリソースや他のツールで管理されていたリソースを、Terraform の状態ファイル（state）に追加し、以降は Terraform で管理・変更できるようになります。Import 操作はリソースの現状を state に反映するだけで、Terraform 構成ファイル（.tf）自体は自動生成されないため、事前に対応するリソース定義を記述しておく必要があります。

```bash
# API Gateway StageのImport構文: terraform import <resource_type.name> <api_id>/<stage_name>
terraform import aws_api_gateway_stage.calc_stage imnkws6bjd/prod
```

**実行結果:**

```
aws_api_gateway_stage.calc_stage: Importing from ID "imnkws6bjd/prod"...
aws_api_gateway_stage.calc_stage: Import prepared!
  Prepared aws_api_gateway_stage for import
aws_api_gateway_stage.calc_stage: Refreshing state... [id=ags-imnkws6bjd-prod]

Import successful!

The resources that were imported are shown above. These resources are now in
your Terraform state and will henceforth be managed by Terraform.
```

### Step 4: 最終適用

```bash
terraform apply -auto-approve
```

**実行結果:**

```
Plan: 0 to add, 1 to change, 1 to destroy.

aws_api_gateway_stage.calc_stage: Modifying... [id=ags-imnkws6bjd-prod]
aws_api_gateway_stage.calc_stage: Modifications complete after 0s [id=ags-imnkws6bjd-prod]
aws_api_gateway_deployment.calc_deployment (deposed object): Destroying... [id=5sdiau2sj3]
aws_api_gateway_deployment.calc_deployment: Destruction complete after 0s

Apply complete! Resources: 0 added, 1 changed, 1 destroyed.
```

## Import 処理の詳細解説

### Import ID の構造

API Gateway Stage の場合：

```
<rest_api_id>/<stage_name>
例: imnkws6bjd/prod
```

### Import 前後の状態変化

**Import 前:**

- Terraform State: `aws_api_gateway_stage.calc_stage` なし
- AWS 環境: "prod" stage 存在
- 結果: 競合エラー

**Import 後:**

- Terraform State: `aws_api_gateway_stage.calc_stage` あり
- AWS 環境: "prod" stage 存在
- 結果: 状態が同期され、正常管理可能

## 学んだベストプラクティス

### 1. リソース移行時の手順

1. **計画的な移行**

   - 既存リソースの確認
   - import コマンドによる取り込み
   - 段階的な適用

2. **避けるべき方法**
   - 無計画な destroy
   - 手動でのリソース削除
   - force overwrite

### 2. Terraform Import 活用

```bash
# 一般的なImport構文
terraform import <resource_type.name> <resource_id>

# よく使用されるAWSリソースの例
terraform import aws_instance.example i-abcd1234
terraform import aws_s3_bucket.example bucket-name
terraform import aws_api_gateway_stage.example api-id/stage-name
```

### 3. 予防策

- **terraform plan**を必ず実行して変更内容を確認
- 本番環境では段階的なデプロイ
- バックアップとロールバック計画の策定
- Import 操作のテスト環境での事前検証

## 結論

今回のエラーは**destroy が必要だったのではなく**、既存リソースを適切に Terraform 管理下に取り込む必要がありました。`terraform import`を使用することで、**ダウンタイムなし**で安全に問題を解決できました。

この手法は本番環境での Infrastructure as Code 移行時に非常に重要なスキルとなります。
