# File Upload API - AWS CDK Project

## 🎯 プロジェクト目的

AWS CDK を使った初心者向けの実践的なファイルアップロード API の構築を学ぶプロジェクトです。

## 📋 プロジェクト概要

### アプリケーション仕様

- **機能**: ファイルアップロード、メタデータ保存、非同期ファイル処理
- **対象ユーザー**: AWS CDK 初心者、サーバーレスアーキテクチャ学習者
- **学習目標**: API Gateway、Lambda、S3、SQS の連携を理解する

### API 仕様

```
POST /upload
  - ファイルをbase64でアップロード
  - S3に保存し、非同期処理をキューに追加
  - レスポンス: { "uploadId": "123", "message": "Processing started" }

GET /status/{uploadId}
  - 処理状況を確認
  - レスポンス: { "status": "processing|completed", "result": "..." }
```

## 🏗️ アーキテクチャ

### Phase 1: 基本のファイルアップロード

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ API Gateway │───►│   Lambda    │───►│     S3      │
│             │    │ (アップロード) │    │ (ファイル保存) │
└─────────────┘    └─────────────┘    └─────────────┘
```

**作成されるリソース:**

- API Gateway (REST API)
- Lambda Function (ファイルアップロード処理)
- S3 Bucket (ファイル保存)
- IAM Roles & Policies (権限設定)

### Phase 2: 非同期処理の追加

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ API Gateway │───►│   Lambda1   │───►│     S3      │
│             │    │ (アップロード) │    │ (ファイル保存) │
└─────────────┘    └─────────────┘    └─────────────┘
                           │
                           ▼
                   ┌─────────────┐    ┌─────────────┐
                   │     SQS     │───►│   Lambda2   │
                   │ (処理キュー) │    │ (ファイル処理) │
                   └─────────────┘    └─────────────┘
```

**追加されるリソース:**

- SQS Queue (非同期処理キュー)
- Lambda Function (ファイル処理)
- DynamoDB Table (処理状況管理) \*Phase 3 で追加予定

### Phase 3: 処理状況確認 API

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ API Gateway │───►│   Lambda3   │───►│  DynamoDB   │
│             │    │ (状況確認)   │    │ (状況管理)   │
└─────────────┘    └─────────────┘    └─────────────┘
```

## 🚀 開発フェーズ

### ✅ Phase 1: 基本のファイルアップロード

- [x] CDK プロジェクト作成
- [ ] API Gateway 設定
- [ ] Lambda 関数(ファイルアップロード)作成
- [ ] S3 バケット作成
- [ ] 権限設定
- [ ] テスト実行

### 🔄 Phase 2: 非同期処理

- [ ] SQS キュー追加
- [ ] Lambda 関数(ファイル処理)追加
- [ ] 非同期処理フロー実装
- [ ] エラーハンドリング

### 🔮 Phase 3: 処理状況確認

- [ ] DynamoDB 追加
- [ ] 状況確認 API 追加
- [ ] 完全なワークフロー完成

## 💻 使用技術

### AWS サービス

- **API Gateway**: RESTful API 提供
- **Lambda**: サーバーレス関数実行
- **S3**: ファイルストレージ
- **SQS**: 非同期メッセージキュー
- **DynamoDB**: NoSQL データベース (Phase 3)
- **IAM**: アクセス権限管理

### 開発技術

- **AWS CDK**: Infrastructure as Code
- **TypeScript**: 型安全な開発
- **Node.js**: Lambda 実行環境
- **LocalStack**: ローカル開発環境

## 🛠️ セットアップ・実行コマンド

### 基本コマンド

```bash
# 依存関係インストール
npm install

# TypeScriptコンパイル
npm run build

# CloudFormationテンプレート生成
npx cdk synth

# LocalStack環境へのデプロイ
npx cdk synth
aws cloudformation deploy --template-file cdk.out/FileUploadApiCdkStack.template.json --stack-name FileUploadApiStack --capabilities CAPABILITY_IAM

# 差分確認
npx cdk diff

# スタック削除
aws cloudformation delete-stack --stack-name FileUploadApiStack
```

### テストコマンド

```bash
# API テスト (Phase 1完了後)
curl -X POST http://localstack:4566/restapis/{api-id}/prod/_user_request_/upload \
  -H "Content-Type: application/json" \
  -d '{"filename": "test.txt", "content": "SGVsbG8gV29ybGQ="}'

# S3バケット確認
aws s3 ls s3://{bucket-name}/

# Lambda関数一覧
aws lambda list-functions
```

## 📚 学習ポイント

### CDK 学習

- **Construct 概念**: 再利用可能なコンポーネント
- **スタック管理**: リソースのライフサイクル管理
- **IAM 権限**: 最小権限の原則
- **環境分離**: dev/prod 環境の分離

### AWS サービス学習

- **API Gateway**: REST API 設計、統合タイプ
- **Lambda**: イベント駆動、環境変数、エラーハンドリング
- **S3**: オブジェクトストレージ、権限管理
- **SQS**: 非同期処理、メッセージキュー

### 設計パターン

- **サーバーレスアーキテクチャ**: イベント駆動設計
- **非同期処理**: SQS を使った疎結合
- **ファイルアップロード**: セキュリティ考慮事項

## 📁 プロジェクト構造

```
file-upload-api-cdk/
├── bin/                    # CDKアプリエントリーポイント
├── lib/                    # スタック定義
│   ├── file-upload-api-cdk-stack.ts  # メインスタック
│   └── constructs/         # 再利用可能コンポーネント
├── lambda/                 # Lambda関数コード
│   ├── upload-handler/     # ファイルアップロード処理
│   ├── process-handler/    # ファイル処理
│   └── status-handler/     # 状況確認
├── test/                   # テストコード
└── docs/                   # ドキュメント
```

## 🎓 参考資料

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [LocalStack Documentation](https://docs.localstack.cloud/)
- [API Gateway Best Practices](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-basic-concept.html)
