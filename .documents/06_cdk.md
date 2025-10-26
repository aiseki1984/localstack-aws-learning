# AWS CDK 学習ログ

## 概要

AWS CDK（Cloud Development Kit）の LocalStack 環境での学習記録

## 実行日

2025 年 10 月 26 日

## 学習内容

### 1. CDK プロジェクトの初期化

```bash
# TypeScriptでCDKプロジェクトを作成
cdk init app --language typescript

# 依存関係のインストール
npm install

# TypeScriptコードのビルド
npm run build
```

### 2. CDK Bootstrap とは

**Bootstrap**は、AWS CDK がデプロイ先の環境で動作するために必要なリソースを事前に作成するプロセス。

#### 作成されるリソース

- **S3 バケット**: CDK アプリのアセット（Lambda コード、Docker イメージなど）保存用
- **IAM ロール**: CloudFormation がリソースを作成するための権限
- **SSM パラメータ**: ブートストラップのバージョン情報（`/cdk-bootstrap/hnb659fds/version`）
- **ECR リポジトリ**: Docker イメージ保存用（必要時）

#### ブートストラップの実行

```bash
# 初回のみ実行が必要
npx cdk bootstrap
```

### 3. 発生した問題と解決方法

#### 問題 1: ブートストラップ不足エラー

```
MyCdkProjectStack: SSM parameter /cdk-bootstrap/hnb659fds/version not found. Has the environment been bootstrapped? Please run 'cdk bootstrap'
```

**解決方法**: `npx cdk bootstrap` を実行してブートストラップリソースを作成

#### 問題 2: LocalStack でのホスト名解決エラー

```
getaddrinfo ENOTFOUND cdk-hnb659fds-assets-000000000000-us-east-1.localstack
```

**原因**: CDK が S3 バケットにアセットを公開する際、LocalStack のホスト名解決に失敗

**解決方法**: CloudFormation テンプレートの直接デプロイ

### 4. LocalStack 環境での CDK ワークフロー

#### 通常の CDK ワークフロー

```bash
# 1. ビルド + デプロイ（ワンコマンド）
npx cdk deploy
```

内部的に実行される処理：

1. **Synthesis（合成）**: TypeScript → CloudFormation テンプレート
2. **Asset Publishing**: アセットを S3 にアップロード
3. **CloudFormation Deploy**: スタックをデプロイ

#### LocalStack 環境での回避ワークフロー

```bash
# 1. ブートストラップ（初回のみ）
npx cdk bootstrap

# 2. CloudFormationテンプレートの合成
npx cdk synth

# 3. 生成されたテンプレートを直接デプロイ
aws cloudformation deploy \
    --template-file cdk.out/MyCdkProjectStack.template.json \
    --stack-name MyCdkProjectStack \
    --no-fail-on-empty-changeset
```

### 5. 実行結果

#### 作成されたリソース

- **Stack**: `MyCdkProjectStack`
- **SQS Queue**: `MyCdkProjectQueue`
- **CDK Metadata**: デプロイメント情報

#### スタック確認コマンド

```bash
# スタック一覧
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE

# スタック詳細
aws cloudformation describe-stacks --stack-name MyCdkProjectStack

# リソース一覧
aws cloudformation describe-stack-resources --stack-name MyCdkProjectStack

# リソースを初心者向けにちょっと見やすくする。
echo "=== CDK で作成されたAWSリソース ===" && echo "" && aws cloudformation describe-stack-resources --stack-name MyCdkProjectStack | jq -r '
  .StackResources[]
  | select(.ResourceType != "AWS::CDK::Metadata")
  | .ResourceType as $type
  | .PhysicalResourceId as $id
  | "🔹 " + ($type | sub("AWS::"; "") | sub("::";" → ")) + ": " + ($id | split("/")[-1] | .[0:60])'
```

### 6. 学んだポイント

#### CDK の利点

- TypeScript でインフラをコード化
- 型安全性と IDE サポート
- 再利用可能なコンポーネント（Constructs）

#### LocalStack 環境での考慮事項

- アセット公開でホスト名解決の問題が発生する可能性
- `cdk synth` + CloudFormation 直接デプロイが有効な回避策
- 本番環境では通常の`cdk deploy`が正常に動作

#### ワークフローの選択

| 方法                     | メリット                                        | デメリット                      |
| ------------------------ | ----------------------------------------------- | ------------------------------- |
| `cdk deploy`             | ワンコマンドで完結<br>アセット管理が自動        | LocalStack で接続エラーの可能性 |
| `synth` + CloudFormation | LocalStack で確実に動作<br>問題の切り分けが容易 | 手動ステップが必要              |

### 7. 次のステップ

- Lambda 関数を含むスタックの作成
- 複数のスタック間でのリソース共有
- CDK Constructs ライブラリの活用
- CI/CD パイプラインでの CDK 活用

## 関連ファイル

- プロジェクトパス: `/workspace/workspace/my-cdk-project/`
- 生成されたテンプレート: `cdk.out/MyCdkProjectStack.template.json`
- スタック定義: `lib/my-cdk-project-stack.ts`

## 参考コマンド

```bash
# CDKコマンド
npx cdk --help
npx cdk ls                    # スタック一覧
npx cdk diff                  # 変更差分確認
npx cdk destroy               # スタック削除

# CloudFormationコマンド
aws cloudformation validate-template --template-body file://template.json
aws cloudformation delete-stack --stack-name StackName
```

### 確認

https://docs.localstack.cloud/aws/integrations/aws-native-tools/aws-cdk/

```bash
echo $AWS_ENDPOINT_URL
http://localstack:4566

curl http://localhost:4566/_localstack/health
curl "${AWS_ENDPOINT_URL}/_localstack/health"

aws sts get-caller-identity
aws configure list

export AWS_ENDPOINT_URL_S3=http://localstack:4566
export AWS_ENDPOINT_URL_S3=http://s3.localhost.localstack.cloud:4566

env | grep -E "(LOCALSTACK|AWS)" | sort

```
