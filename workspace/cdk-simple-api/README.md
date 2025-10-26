# CDK Simple API with LocalStack

LocalStack を使ったローカル開発・テスト用の CDK TypeScript プロジェクトです。API Gateway と Lambda の統合を含むシンプルな API を作成します。

## プロジェクト概要

このプロジェクトでは以下を実演します：

- **API Gateway REST API** (CORS 対応)
- **Lambda 関数** (Node.js 18.x ランタイム使用)
- **CloudFormation デプロイメント** (CDK synthesis 経由)
- **LocalStack 統合** (ローカル AWS サービスシミュレーション)

## アーキテクチャ

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   API Gateway   │───▶│  Lambda Function │───▶│   Response      │
│                 │    │                  │    │                 │
│ GET /           │    │  hello.handler   │    │ JSON with       │
│ GET /hello      │    │                  │    │ timestamp &     │
│ POST /hello     │    │                  │    │ request info    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## プロジェクト構造

```
cdk-simple-api/
├── bin/
│   └── cdk-simple-api.ts          # CDKアプリのエントリーポイント
├── lib/
│   └── cdk-simple-api-stack.ts    # API Gateway & Lambdaを含むスタック定義
├── lambda/
│   ├── hello.js                   # Lambda関数のコード
│   └── hello-function.zip         # パッケージ化されたLambda関数（生成される）
├── localstack-template.json       # LocalStack最適化CloudFormationテンプレート
├── cdk.out/                       # CDK synthesis出力ディレクトリ
├── package.json
└── README.md
```

## 前提条件

- Node.js (18.x 以降)
- AWS CDK CLI
- AWS CLI
- Docker で LocalStack が動作していること
- LocalStack 環境へのアクセス（dev コンテナ経由）

## LocalStack デプロイメント戦略

### なぜ直接 CDK Deploy ではなく、CDK Synth + CloudFormation を使うのか？

LocalStack で作業する際に、CloudFormation テンプレートを生成してから AWS CLI 経由でデプロイする理由：

1. **アセット処理**: CDK のアセット管理（Lambda 用 S3 バケット）が LocalStack でシームレスに動作しない
2. **エンドポイント設定**: LocalStack では特定のエンドポイント設定が必要で、CDK deploy では適切に処理されない
3. **デバッグ**: CloudFormation テンプレートの方がリソース作成プロセスの可視性が高い
4. **互換性**: 一部の CDK 機能が LocalStack の CDK 統合で完全にサポートされていない

### Lambda 関数のパッケージング

Lambda 関数を事前に ZIP ファイル化する理由：

- LocalStack の S3 アセット処理が制限されている
- CloudFormation 内での直接コード埋め込み（ZipFile）がより信頼性が高い
- デプロイ問題発生時のデバッグが容易
- 異なる LocalStack バージョン間での動作がより予測可能

## セットアップとデプロイメント

### 1. 依存関係のインストール

```bash
npm install
```

### 2. プロジェクトのビルド

```bash
npm run build
```

### 3. Lambda 関数のパッケージ化

```bash
cd lambda
zip -r hello-function.zip hello.js
cd ..
```

### 4. CloudFormation テンプレートの生成

```bash
npx cdk synth --output cdk.out
```

これにより標準的な CDK CloudFormation テンプレートが作成されますが、LocalStack 最適化版を使用します。

### 5. LocalStack へのデプロイ

```bash
# LocalStack最適化テンプレートをデプロイ
aws --endpoint-url=$AWS_ENDPOINT_URL cloudformation create-stack \
  --stack-name CdkSimpleApiStack \
  --template-body file://localstack-template.json \
  --capabilities CAPABILITY_IAM
```

### 6. デプロイメントの確認

```bash
# スタックステータスの確認
aws --endpoint-url=$AWS_ENDPOINT_URL cloudformation describe-stacks --stack-name CdkSimpleApiStack

# 出力からAPI Gateway IDを取得
aws --endpoint-url=$AWS_ENDPOINT_URL cloudformation describe-stacks \
  --stack-name CdkSimpleApiStack \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiId`].OutputValue' \
  --output text
```

## API テスト

### エンドポイント

`{API_ID}`をスタック出力からの実際の API Gateway ID に置き換えてください：

1. **ルートエンドポイント**:

   ```bash
   curl -X GET "http://localstack:4566/restapis/{API_ID}/prod/_user_request_/"
   ```

2. **Hello エンドポイント (GET)**:

   ```bash
   curl -X GET "http://localstack:4566/restapis/{API_ID}/prod/_user_request_/hello"
   ```

3. **Hello エンドポイント (POST)**:
   ```bash
   curl -X POST "http://localstack:4566/restapis/{API_ID}/prod/_user_request_/hello" \
     -H "Content-Type: application/json" \
     -d '{"name": "Test User"}'
   ```

### 期待されるレスポンス

```json
{
  "message": "Hello from LocalStack API Gateway!",
  "timestamp": "2025-10-26T16:40:10.416Z",
  "path": "/hello",
  "method": "POST",
  "requestId": "6eaf8f67-ead7-45f6-b1dc-4bb4c0cd768b"
}
```

## クリーンアップ

### CloudFormation スタックの削除

```bash
aws --endpoint-url=$AWS_ENDPOINT_URL cloudformation delete-stack --stack-name CdkSimpleApiStack
```

### ローカルファイルの削除

```bash
rm -rf cdk.out/
rm lambda/hello-function.zip
```

## 開発ワークフロー

### 1. Lambda 関数の修正

`lambda/hello.js`を編集して再パッケージ：

```bash
cd lambda && zip -r hello-function.zip hello.js && cd ..
```

### 2. スタックの更新

リビルドとテンプレート再生成：

```bash
npm run build
npx cdk synth
```

### 3. デプロイメントの更新

```bash
aws --endpoint-url=$AWS_ENDPOINT_URL cloudformation update-stack \
  --stack-name CdkSimpleApiStack \
  --template-body file://localstack-template.json \
  --capabilities CAPABILITY_IAM
```

## トラブルシューティング

### よくある問題

1. **Lambda 関数が見つからない**: ZIP ファイルが適切に作成され、`hello.js`が含まれていることを確認
2. **API Gateway 502 エラー**: Lambda 関数のログと権限を確認
3. **CloudFormation スタック作成に失敗**: LocalStack が実行中でアクセス可能であることを確認

### デバッグコマンド

```bash
# Lambda関数の確認
aws --endpoint-url=$AWS_ENDPOINT_URL lambda list-functions

# API Gateway APIの確認
aws --endpoint-url=$AWS_ENDPOINT_URL apigateway get-rest-apis

# CloudFormationスタックの確認
aws --endpoint-url=$AWS_ENDPOINT_URL cloudformation list-stacks

# Lambdaログの表示（LocalStackでCloudWatchが有効な場合）
aws --endpoint-url=$AWS_ENDPOINT_URL logs describe-log-groups
```

## CDK コマンド

- `npm run build` - TypeScript を JS にコンパイル
- `npm run watch` - 変更を監視してコンパイル
- `npm run test` - Jest ユニットテストの実行
- `npx cdk synth` - 合成された CloudFormation テンプレートを出力
- `npx cdk diff` - デプロイ済みスタックと現在の状態を比較
- `npx cdk deploy` - デフォルトの AWS アカウント/リージョンにスタックをデプロイ（LocalStack では非推奨）

## LocalStack 固有の注意点

- LocalStack との互換性向上のため、生成された CDK テンプレートではなく`localstack-template.json`を使用
- Lambda コードは`ZipFile`プロパティを使用して CloudFormation テンプレートに直接埋め込み
- API Gateway エンドポイントは LocalStack 固有の URL 形式を使用: `http://localstack:4566/restapis/{api-id}/prod/_user_request_/`
- 開発の利便性のため CORS が事前設定済み
