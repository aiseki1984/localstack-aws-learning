# Project-01-02: Lambda(TypeScript) + DynamoDB

TypeScript で Lambda 関数を作成し、DynamoDB と連携するユーザー管理 API を構築するプロジェクトです。

## 📋 目次

- [概要](#概要)
- [プロジェクト構成](#プロジェクト構成)
- [技術スタック](#技術スタック)
- [セットアップ](#セットアップ)
- [開発](#開発)
- [デプロイメント](#デプロイメント)
- [クリーンアップ](#クリーンアップ)
- [テスト](#テスト)
- [API 仕様](#api仕様)
- [学習ポイント](#学習ポイント)
- [参考資料](#参考資料)

## 🎯 概要

AWS CLI と LocalStack を使用して Lambda 関数と DynamoDB を手動で構築・連携させる学習プロジェクトです。LocalStack 環境を使用することで、実際の AWS 環境を使わずに安全に学習できます。

### 実現する機能

- ユーザーの作成（POST）
- ユーザーの取得（GET）
- TypeScript による型安全な開発
- 自動テスト（Unit/Integration）
- 自動デプロイメント

## 🏗️ プロジェクト構成

```
project-01-02-lambda-dynamodb/
├── README.md                     # プロジェクト説明
├── scripts/                      # デプロイメントスクリプト
│   └── deploy.sh                 # 自動デプロイスクリプト
└── lambda/                       # Lambda関数プロジェクト
    ├── package.json              # 依存関係・npm scripts
    ├── tsconfig.json             # TypeScript設定
    ├── vitest.config.ts          # Unitテスト設定
    ├── vitest.integration.config.ts # Integrationテスト設定
    └── src/                      # ソースコード
        ├── index.ts              # Lambdaハンドラー（エントリーポイント）
        ├── user.ts               # ユーザー操作ロジック
        ├── dynamodb.ts           # DynamoDB設定
        ├── types.ts              # 型定義
        ├── index.test.ts         # Unitテスト
        └── index.integration.test.ts # Integrationテスト
```

### 設計思想

- **関心の分離**: 各ファイルが明確な責任を持つ
- **型安全性**: TypeScript による型定義
- **テスタビリティ**: Unit/Integration テストの分離
- **IaC 分離**: インフラ設定とアプリケーションコードの分離

## 🛠️ 技術スタック

### Runtime & Language

- **Node.js**: 20.x
- **TypeScript**: 5.x
- **esbuild**: バンドル・ミニファイ

### AWS Services

- **Lambda**: サーバーレス実行環境
- **DynamoDB**: NoSQL データベース
- **IAM**: 権限管理

### Development Tools

- **LocalStack**: ローカル AWS 環境
- **Vitest**: テストフレームワーク
- **AWS CLI**: デプロイメント

## 🚀 セットアップ

### 前提条件

- Node.js 18.x 以上
- Docker & Docker Compose
- AWS CLI
- LocalStack が起動済み

### 1. 依存関係のインストール

```bash
cd lambda/
npm install
```

### 2. 環境変数の設定

LocalStack 環境の場合：

```bash
export AWS_ENDPOINT_URL=http://localstack:4566
```

開発環境の場合：

```bash
export AWS_ENDPOINT_URL=http://localhost:4566
```

## 💻 開発

### TypeScript 型チェック

```bash
cd lambda/
npm run typecheck
```

### ビルド（esbuild 使用）

```bash
npm run build
# → dist/index.js が生成される
```

### 開発時の監視モード

```bash
npm run dev
# TypeScriptの変更を監視
```

## 🚀 デプロイメント

## クリーンアップ

`scripts/cleanup.sh`

### 自動デプロイ（推奨）

```bash
# プロジェクトルートから実行
./scripts/deploy.sh
```

### デプロイフロー詳細

`scripts/deploy.sh` で以下を自動実行：

1. **📊 DynamoDB テーブル作成**

   ```bash
   aws dynamodb create-table \
     --table-name users \
     --key-schema AttributeName=id,KeyType=HASH \
     --billing-mode PAY_PER_REQUEST
   ```

2. **🔐 IAM ロール作成**

   ```bash
   aws iam create-role \
     --role-name lambda-execution-role \
     --assume-role-policy-document {...}
   ```

3. **🔨 TypeScript ビルド**

   ```bash
   cd lambda/
   npm install
   npm run build  # esbuild実行
   ```

4. **📦 デプロイパッケージ作成**

   ```bash
   cd dist/
   zip ../function.zip index.js
   # AWS SDKは除外（Lambda環境に標準搭載）
   ```

5. **⚡ Lambda 関数デプロイ**

   ```bash
   aws lambda create-function \
     --function-name lambda-dynamodb-demo \
     --runtime nodejs20.x \
     --handler index.handler \
     --zip-file fileb://lambda/function.zip
   ```

6. **🧪 自動テスト実行**
   - POST: ユーザー作成テスト
   - GET: ユーザー取得テスト

### 手動デプロイ

個別にステップを実行したい場合：

```bash
# 1. ビルド
cd lambda/
npm run build

# 2. パッケージ作成
cd dist/
zip ../function.zip index.js

# 3. Lambda関数作成/更新
aws lambda create-function \
  --function-name lambda-dynamodb-demo \
  --runtime nodejs20.x \
  --role arn:aws:iam::000000000000:role/lambda-execution-role \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --endpoint-url=$AWS_ENDPOINT_URL
```

## 🧪 テスト

### Unit テスト

```bash
cd lambda/
npm test
```

### Integration テスト

```bash
npm run test:integration
```

### テスト内容

**Unit Test (`index.test.ts`)**

- Lambda ハンドラーのロジック
- HTTP メソッドのルーティング
- エラーハンドリング
- ユーザー作成ロジック

**Integration Test (`index.integration.test.ts`)**

- 実際の DynamoDB との連携
- エンドツーエンドの動作確認
- LocalStack 環境での実行

## 📡 API 仕様

### Base URL

- LocalStack: `http://localhost:4566` (開発時)
- LocalStack: `http://localstack:4566` (Docker 環境)

### Endpoints

#### ユーザー作成

```http
POST /
Content-Type: application/json

{
  "httpMethod": "POST",
  "body": "{\"id\":\"user-123\",\"name\":\"John Doe\",\"email\":\"john@example.com\"}"
}
```

**Response (201)**

```json
{
  "statusCode": 201,
  "body": "{\"id\":\"user-123\",\"name\":\"John Doe\",\"email\":\"john@example.com\",\"createdAt\":\"2025-11-03T05:54:57.622Z\"}"
}
```

#### ユーザー取得

```http
GET /{id}

{
  "httpMethod": "GET",
  "pathParameters": {"id": "user-123"}
}
```

**Response (200)**

```json
{
  "statusCode": 200,
  "body": "{\"id\":\"user-123\",\"name\":\"John Doe\",\"email\":\"john@example.com\",\"createdAt\":\"2025-11-03T05:54:57.622Z\"}"
}
```

## 📚 学習ポイント

### 1. TypeScript Lambda 開発

- **esbuild**: 高速バンドル・ミニファイ
- **型安全性**: インターフェース定義とコンパイル時チェック
- **ファイル分割**: 関心の分離による保守性向上

### 2. AWS SDK v3 使用法

- **モジュール設計**: 必要な機能のみインポート
- **DynamoDB Document Client**: JSON 操作の簡素化
- **環境変数対応**: LocalStack/AWS 環境の切り替え

### 3. LocalStack 活用

- **コスト削減**: 実 AWS 環境不要
- **安全性**: 本番環境への影響なし
- **開発効率**: 高速な反復開発

### 4. テスト戦略

- **Unit Test**: ロジックの検証（AWS SDK モック）
- **Integration Test**: 実環境との連携検証
- **自動化**: CI/CD パイプラインへの組み込み準備

### 5. デプロイ自動化

- **Infrastructure as Code**: スクリプトによる再現可能なデプロイ
- **エラーハンドリング**: 失敗時の適切な処理
- **状態管理**: Lambda 関数の準備完了待機

## 📖 参考資料

- [TypeScript による Lambda 関数の作成](https://docs.aws.amazon.com/ja_jp/lambda/latest/dg/lambda-typescript.html)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [DynamoDB Document Client](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/modules/_aws_sdk_lib_dynamodb.html)
- [LocalStack Documentation](https://docs.localstack.cloud/)
- [esbuild Documentation](https://esbuild.github.io/)
- [Vitest Documentation](https://vitest.dev/)
- [Typescript 開発である自分が AWS Lambda を開発するにあたって知っておきたかったこと](https://zenn.dev/hiroto_fp/articles/32d358d6dad9ae)
