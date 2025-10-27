# Project 01: Lambda + API Gateway ハンズオン

## 概要

AWS CLI を使用して Lambda 関数と API Gateway を手動で構築・連携させる学習プロジェクトです。LocalStack 環境を使用することで、実際の AWS 環境を使わずに安全に学習できます。

## 学習目的

- AWS CLI の基本的な使い方を習得
- Lambda 関数の作成・管理方法を理解
- API Gateway の構造と設定方法を学習
- Lambda と API Gateway の統合方法を理解
- AWS リソースの階層構造とデプロイメントの概念を把握

## 使用技術スタック

### 🛠️ インフラストラクチャ

- **LocalStack**: ローカル AWS 環境シミュレーター
- **Docker**: LocalStack のコンテナ実行環境
- **AWS CLI**: リソース管理用コマンドラインツール

### 💻 アプリケーション

- **Node.js (v22.x)**: Lambda 関数のランタイム
- **JavaScript**: Lambda 関数の実装言語

### 🔧 ツール

- **curl**: API テスト用 HTTP クライアント
- **jq**: JSON データの整形・解析

## プロジェクト構成

```
project-01/
├── readme.md                    # このファイル
├── index.js                     # Lambda 関数のソースコード
├── function.zip                 # Lambda デプロイ用の ZIP ファイル
├── output.txt                   # コマンド実行結果の保存先
└── function_urls.json           # Lambda 関数 URL の情報
```

## 構築の流れ

### 1. Lambda 関数の作成

- Node.js で簡単な計算機能を実装
- ZIP 形式でパッケージ化
- AWS CLI で Lambda 関数をデプロイ

### 2. API Gateway の設定

- REST API の作成
- リソース (`/calc`) の追加
- POST メソッドの設定
- Lambda 統合の設定

### 3. デプロイとテスト

- API のデプロイ（prod ステージ）
- curl コマンドでの動作確認

## 主要なコマンド例

### Lambda 関数の作成

```bash
# ZIP ファイルの作成
zip function.zip index.js

# Lambda 関数のデプロイ
aws lambda create-function \
    --function-name localstack-lambda-url-example \
    --runtime nodejs22.x \
    --zip-file fileb://function.zip \
    --handler index.handler \
    --role arn:aws:iam::000000000000:role/lambda-role
```

### API Gateway の設定

```bash
# REST API の作成
aws apigateway create-rest-api \
    --name 'LambdaAPI' \
    --description 'API for Lambda function'

# Lambda 統合の設定
aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method POST \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "$INTEGRATION_URI"
```

## 動作確認

作成された API エンドポイントに対して POST リクエストを送信：

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"num1": "10", "num2": "10"}' \
  "http://localstack:4566/restapis/$API_ID/prod/_user_request_/calc"
```

期待される応答：

```
The product of 10 and 10 is 100
```

## 学習ポイント

### 🎯 理解すべき概念

1. **API Gateway の階層構造**: REST API → Resource → Method → Integration
2. **Lambda 統合 URI**: 複雑な ARN 形式の理解
3. **デプロイメントの必要性**: 設定変更後は必ずデプロイが必要
4. **LocalStack 特有の仕様**: エンドポイント形式やアカウント ID

### 💡 実践的なスキル

- AWS CLI の基本操作
- JSON クエリの活用（`--query` オプション）
- 変数を使った効率的なスクリプト作成
- エラーハンドリングとトラブルシューティング

## 関連ドキュメント

- [00_setup.md](../../../.documents/project-01-lambda-api/00_setup.md): Lambda 関数の詳細設定
- [01_api_gateway.md](../../../.documents/project-01-lambda-api/01_api_gateway.md): API Gateway の詳細設定
- [02_cleanup.md](../../../.documents/project-01-lambda-api/02_cleanup.md): リソースの削除手順

## 注意事項

- このプロジェクトは **学習目的** です
- **LocalStack 環境** での実行を想定しています
- 実際の AWS 環境で実行する場合は、料金が発生する可能性があります
- リソースの削除を忘れずに行ってください

## 次のステップ

1. **IaC での実装**: CloudFormation や CDK を使った同じ構成の作成
2. **認証の追加**: API キーや IAM 認証の設定
3. **エラーハンドリング**: Lambda 関数のエラー処理の改善
4. **モニタリング**: CloudWatch ログの設定と確認

---

このプロジェクトを通じて、AWS の基本的なサーバーレスアーキテクチャの理解を深めることができます。
