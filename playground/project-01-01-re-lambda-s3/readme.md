# Lambda TypeScript + S3 CRUD プロジェクト

AWS Lambda(TypeScript)を使用してS3でテキストファイルの完全なCRUD操作を行うプロジェクトです。LocalStack環境での開発・テストが可能です。

## 🚀 **クイックスタート**

```bash
# 1. 環境変数の設定
export AWS_ENDPOINT_URL=http://localstack:4566

# 2. デプロイ
./scripts/deploy.sh

# 3. CRUD全機能テスト
./scripts/crud-test.sh

# 4. リソース確認
./scripts/list-resources.sh
```

## 📁 **プロジェクト構成**

```
project-01-01-re-lambda-s3/
├── scripts/
│   ├── deploy.sh                    # 🚀 メインデプロイスクリプト
│   ├── crud-test.sh                 # 🧪 CRUD全機能テストスクリプト
│   ├── list-resources.sh            # 🔍 AWSリソース確認スクリプト
│   ├── cleanup.sh                   # 🧹 AWSリソース削除スクリプト
│   ├── cleanup-scripts.sh           # 📁 スクリプト整理ツール
│   ├── backup-scripts/              # 📦 バックアップファイル
│   └── ref_*.sh                     # 📚 参考用スクリプト
├── lambda/
│   ├── src/
│   │   ├── index.ts                 # 🔧 CRUD統合ハンドラー
│   │   ├── index.test.ts            # 🧪 単体テスト
│   │   └── test-lambda.ts           # 🧪 TypeScriptテストランナー
│   ├── package.json                 # 📦 依存関係とスクリプト
│   ├── tsconfig.json               # ⚙️ TypeScript設定
│   └── dist/                       # 📂 ビルド出力（自動生成）
└── readme.md                        # 📖 このファイル
```

## 🎯 **CRUD機能**

一つのLambda関数で完全なCRUD操作を実現：

| 操作 | HTTPメソッド | 説明 | ペイロード例 |
|------|-------------|------|-------------|
| **CREATE** | `POST` | ファイルアップロード | `{"httpMethod":"POST","body":"{\"fileName\":\"test.txt\",\"content\":\"Hello!\"}"}` |
| **READ** | `GET` | ファイル一覧取得 | `{"httpMethod":"GET"}` |
| **READ** | `GET` | 個別ファイル取得 | `{"httpMethod":"GET","pathParameters":{"fileName":"test.txt"}}` |
| **UPDATE** | `PUT` | ファイル更新 | `{"httpMethod":"PUT","body":"{\"fileName\":\"test.txt\",\"content\":\"Updated!\"}"}` |
| **DELETE** | `DELETE` | ファイル削除 | `{"httpMethod":"DELETE","pathParameters":{"fileName":"test.txt"}}` |

### 🔧 **統合ハンドラーの仕組み**

`lambda/src/index.ts`では、HTTPメソッドとパスに基づいてルーティングする統合ハンドラーを実装：

```typescript
// CREATE - ファイルアップロード
POST / + body: {fileName, content}

// READ - ファイル一覧
GET /

// READ - 個別ファイル
GET /{fileName} or GET /?fileName=xxx

// UPDATE - ファイル更新  
PUT / + body: {fileName, content}

// DELETE - ファイル削除
DELETE /{fileName} or DELETE /?fileName=xxx
```

## 📋 **スクリプトの使用方法**

### 🚀 **deploy.sh - メインデプロイスクリプト**
```bash
./scripts/deploy.sh
```
**機能:**
- S3バケット作成
- IAMロール・ポリシー設定
- TypeScriptビルド
- Lambda関数デプロイ
- 基本動作テスト（CREATE/READ）

### 🧪 **crud-test.sh - 包括テストスクリプト**
```bash
./scripts/crud-test.sh
```
**機能:**
- CREATE/READ/UPDATE/DELETE全操作テスト
- エラーケーステスト
- 日本語ファイル対応テスト
- 安全なファイルクリーンアップ（明示的ファイル名指定）

### 🔍 **list-resources.sh - リソース確認スクリプト**
```bash
./scripts/list-resources.sh
```
**機能:**
- LocalStack健康状態確認
- Lambda関数詳細表示
- S3バケット・オブジェクト一覧
- IAMロール・ポリシー確認
- リソースサマリー表示

### 🧹 **cleanup.sh - リソース削除スクリプト**
```bash
./scripts/cleanup.sh
```
**機能:**
- 安全確認プロンプト付きリソース削除
- Lambda関数、S3バケット（内容含む）、IAMロール削除
- ローカル一時ファイル削除
- 削除後の次のステップ案内

## 📦 **セットアップ手順**

### 1. 依存関係のインストール
```bash
cd lambda
npm install
```

### 2. 環境変数設定
```bash
export AWS_ENDPOINT_URL=http://localstack:4566
```

### 3. デプロイ実行
```bash
./scripts/deploy.sh
```

### 4. テスト実行
```bash
./scripts/crud-test.sh
```

## 🛠️ **開発用コマンド**

```bash
# TypeScriptビルド
cd lambda && npm run build

# ビルド（ファイル変更監視）
cd lambda && npm run build:watch

# 単体テスト
cd lambda && npm test

# テスト（ファイル変更監視）
cd lambda && npm run test:watch

# TypeScriptテストランナー
cd lambda && npm run test:lambda

# 開発モード（ファイル変更監視）
cd lambda && npm run dev
```

### 📦 **依存関係**

```bash
# 初期セットアップ時に必要なパッケージ
npm init -y
npm install -D typescript
npm install -D @types/aws-lambda
npm install -D @aws-sdk/client-s3
npm install -D vitest 
npm install -D esbuild
npm install -D @types/node
npm install -D tsx  # TypeScript実行用
```

## 🌍 **環境変数**

| 変数名 | デフォルト値 | 説明 |
|--------|-------------|------|
| `AWS_ENDPOINT_URL` | `http://localstack:4566` | LocalStackエンドポイント |
| `AWS_REGION` | `us-east-1` | AWSリージョン |
| `BUCKET_NAME` | `my-test-bucket` | S3バケット名 |
| `AWS_ACCESS_KEY_ID` | `test` | LocalStack用アクセスキー |
| `AWS_SECRET_ACCESS_KEY` | `test` | LocalStack用シークレットキー |

## 🧪 **テスト例**

### CLI経由でのテスト
```bash
# ファイルアップロード
echo '{"httpMethod":"POST","body":"{\"fileName\":\"hello.txt\",\"content\":\"Hello World!\"}"}' | base64 -w 0 > payload.txt
aws lambda invoke --function-name s3-text-handler --payload file://payload.txt response.json --endpoint-url=$AWS_ENDPOINT_URL

# ファイル一覧取得
echo '{"httpMethod":"GET"}' | base64 -w 0 > payload.txt
aws lambda invoke --function-name s3-text-handler --payload file://payload.txt response.json --endpoint-url=$AWS_ENDPOINT_URL

# 個別ファイル取得
echo '{"httpMethod":"GET","pathParameters":{"fileName":"hello.txt"}}' | base64 -w 0 > payload.txt
aws lambda invoke --function-name s3-text-handler --payload file://payload.txt response.json --endpoint-url=$AWS_ENDPOINT_URL

# ファイル更新
echo '{"httpMethod":"PUT","body":"{\"fileName\":\"hello.txt\",\"content\":\"Updated content!\"}"}' | base64 -w 0 > payload.txt
aws lambda invoke --function-name s3-text-handler --payload file://payload.txt response.json --endpoint-url=$AWS_ENDPOINT_URL

# ファイル削除
echo '{"httpMethod":"DELETE","pathParameters":{"fileName":"hello.txt"}}' | base64 -w 0 > payload.txt
aws lambda invoke --function-name s3-text-handler --payload file://payload.txt response.json --endpoint-url=$AWS_ENDPOINT_URL

# 結果確認
cat response.json | jq .
```

### S3直接確認
```bash
# バケット内容確認
aws s3 ls s3://my-test-bucket --recursive --endpoint-url=$AWS_ENDPOINT_URL

# ファイルダウンロード
aws s3 cp s3://my-test-bucket/uploads/hello.txt - --endpoint-url=$AWS_ENDPOINT_URL
```

### JavaScript/TypeScriptでの使用例
```typescript
// 1. ファイルアップロード
const uploadEvent = {
  httpMethod: "POST",
  body: JSON.stringify({
    fileName: "sample.txt",
    content: "これはサンプルファイルです。"
  })
};

// 2. ファイル一覧取得
const listEvent = {
  httpMethod: "GET"
};

// 3. 個別ファイル取得
const getEvent = {
  httpMethod: "GET",
  pathParameters: { fileName: "sample.txt" }
};

// 4. ファイル更新
const updateEvent = {
  httpMethod: "PUT",
  body: JSON.stringify({
    fileName: "sample.txt",
    content: "更新されたファイルです。"
  })
};

// 5. ファイル削除
const deleteEvent = {
  httpMethod: "DELETE",
  pathParameters: { fileName: "sample.txt" }
};
```

## 📚 **技術スタック**

- **Runtime**: Node.js 20.x
- **Language**: TypeScript 5.x
- **Build Tool**: esbuild
- **Testing**: Vitest
- **AWS Services**: Lambda, S3, IAM
- **Local Development**: LocalStack
- **Package Manager**: npm

## ⭐ **特徴**

- ✅ **統合ハンドラー**: 1つの関数でCRUD全操作
- ✅ **型安全**: TypeScript完全対応
- ✅ **日本語対応**: UTF-8テキストファイルサポート
- ✅ **エラーハンドリング**: 適切なHTTPステータスコードとエラーメッセージ
- ✅ **メタデータ**: ファイルアップロード情報を自動付与
- ✅ **柔軟なルーティング**: パス・クエリパラメータ両対応
- ✅ **安全なテスト**: 明示的ファイル名でのクリーンアップ
- ✅ **LocalStack対応**: ローカル開発環境完備
- ✅ **包括的スクリプト**: デプロイ・テスト・管理の自動化

## 🔄 **推奨ワークフロー**

### 初回セットアップ
```bash
export AWS_ENDPOINT_URL=http://localstack:4566
./scripts/deploy.sh
./scripts/list-resources.sh  # 結果確認
```

### 開発・テスト
```bash
./scripts/crud-test.sh       # 包括的テスト
./scripts/list-resources.sh  # リソース状況確認
```

### コード変更後
```bash
./scripts/deploy.sh          # 再デプロイ
./scripts/crud-test.sh       # 動作確認
```

### プロジェクト終了時
```bash
./scripts/cleanup.sh         # リソース削除
# または
docker-compose down && docker-compose up -d  # LocalStack全体リセット
```

## 🛠️ **トラブルシューティング**

### LocalStackが起動しない
```bash
# LocalStack健康状態確認
curl "${AWS_ENDPOINT_URL}/_localstack/health" | jq .

# LocalStackを再起動
docker-compose down
docker-compose up -d
```

### Lambda関数でエラーが発生する
```bash
# Lambda関数ログ確認
aws logs describe-log-groups --endpoint-url=$AWS_ENDPOINT_URL

# 関数詳細確認
aws lambda get-function --function-name s3-text-handler --endpoint-url=$AWS_ENDPOINT_URL
```

### S3バケットが見つからない
```bash
# リソース確認
./scripts/list-resources.sh

# 手動バケット作成
aws s3 mb s3://my-test-bucket --endpoint-url=$AWS_ENDPOINT_URL
```

### ビルドエラー
```bash
# 依存関係再インストール
cd lambda && rm -rf node_modules package-lock.json && npm install

# TypeScript設定確認
cd lambda && npx tsc --noEmit
```

## 📖 **参考情報**

- [AWS Lambda TypeScript](https://docs.aws.amazon.com/lambda/latest/dg/typescript-handler.html)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [LocalStack Documentation](https://docs.localstack.cloud/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vitest](https://vitest.dev/)
- [esbuild](https://esbuild.github.io/)

## 🎉 **成果**

このプロジェクトにより、以下を実現しました：

- **完全なCRUD API**: S3ベースのファイル管理システム
- **型安全な開発**: TypeScriptによる堅牢なコード
- **効率的なテスト**: 自動化されたテストスイート
- **安全な管理**: 明示的なリソース管理とクリーンアップ
- **実用的なツール**: 開発・デプロイ・管理の完全自動化
- **LocalStack統合**: 本番環境と同等のローカル開発環境

---

**Happy Coding! 🚀**

> このプロジェクトは、AWS Lambda + S3での実用的なファイル管理APIの完全な実装例です。LocalStack環境での開発から実際のAWS環境へのデプロイまで、モダンなサーバーレス開発のベストプラクティスを体験できます。