# Project-03: SAM Lambda + API Gateway

LocalStack 環境で AWS SAM (Serverless Application Model) を使用した Lambda 関数と API Gateway の構築プロジェクトです。

## プロジェクト概要

このプロジェクトは Terraform ベースの project-02 と同等の機能を、SAM を使用してより簡潔に実装したものです。Hello World API エンドポイントを提供するサーバーレスアプリケーションを構築します。

## ファイル構成

- `hello-world/` - Lambda 関数のソースコード
- `events/` - テスト用のイベントファイル
- `hello-world/tests/` - ユニットテストファイル
- `template.yaml` - SAM テンプレート（AWS リソース定義）
- `samconfig.toml` - デプロイ設定ファイル

## 作成される AWS リソース

SAM が自動的に以下の 6 個のリソースを作成します：

1. **Lambda Function**: Hello World 処理
2. **IAM Role**: Lambda 実行ロール
3. **API Gateway REST API**: API エンドポイント
4. **API Gateway Deployment**: API デプロイメント
5. **API Gateway Stage**: Prod ステージ
6. **Lambda Permission**: API Gateway 連携権限

## デプロイされた API

- **エンドポイント**: `http://localstack:4566/restapis/97kpcfv5ou/Prod/_user_request_/hello`
- **メソッド**: GET
- **レスポンス**: `{"message":"hello world"}`

## 前提条件

以下のツールが LocalStack コンテナ内にインストール済みです：

- **SAM CLI**: v1.127.0 - サーバーレスアプリケーション管理
- **Node.js**: v20.19.2 - Lambda 実行環境
- **npm**: 10.8.2 - パッケージ管理
- **Docker**: Lambda 環境エミュレート用

## クイックスタート

### 1. LocalStack コンテナにアクセス

```bash
cd /Users/pakupaku/_workspace/cicd/localstack-learning-2
docker-compose exec localstack_client bash
```

### 2. プロジェクトディレクトリに移動

```bash
cd /workspace/project-03-sam-lambda-api
```

### 3. アプリケーションビルド

```bash
sam build
```

### 4. LocalStack へデプロイ

```bash
# 初回デプロイ（設定ファイル作成）
sam deploy --guided

# 2回目以降
sam deploy
```

### 5. API 動作確認

```bash
curl -X GET "http://localstack:4566/restapis/97kpcfv5ou/Prod/_user_request_/hello"
```

## ローカル開発・テスト

### ローカルビルド

```bash
sam build
```

### ローカル関数実行

```bash
# テストイベントでLambda関数を直接実行
sam local invoke HelloWorldFunction --event events/event.json
```

### ローカル API 起動

```bash
# ローカルでAPI Gateway エミュレート (ポート3000)
sam local start-api

# 別ターミナルでテスト
curl http://localhost:3000/hello
```

## リソース管理

### デプロイ済みリソース確認

```bash
# CloudFormationスタック確認
aws cloudformation describe-stacks --stack-name sam-app-desu

# Lambda関数一覧
aws lambda list-functions

# API Gateway一覧
aws apigateway get-rest-apis
```

### ログ確認

```bash
# Lambda関数のログを表示
sam logs -n HelloWorldFunction --stack-name sam-app-desu --tail
```

### リソース削除

```bash
# SAMスタック削除
sam delete --stack-name sam-app-desu

# 削除確認
aws cloudformation list-stacks --stack-status-filter DELETE_COMPLETE
```

## SAM vs Terraform 比較

| 項目               | SAM (当プロジェクト)  | Terraform (project-02) |
| ------------------ | --------------------- | ---------------------- |
| **設定ファイル**   | template.yaml (30 行) | main.tf (80 行)        |
| **作成リソース数** | 6 個 (自動生成)       | 9 個 (手動定義)        |
| **学習コスト**     | 低                    | 中                     |
| **デプロイ時間**   | 1 分                  | 1 分 30 秒             |
| **ローカル開発**   | 充実                  | 限定的                 |
| **柔軟性**         | 中                    | 高                     |

## トラブルシューティング

### よくある問題

1. **SAM CLI が見つからない**

   ```bash
   which sam
   sam --version
   ```

2. **Node.js バージョン不一致**

   ```bash
   node --version  # v20.19.2 である必要
   ```

3. **LocalStack 接続エラー**

   ```bash
   aws --endpoint-url=http://localstack:4566 sts get-caller-identity
   ```

4. **デプロイ失敗**
   ```bash
   sam deploy --debug
   ```

## 関連ドキュメント

詳細なドキュメントは `.documents/project-03-sam-lambda-api/` に格納されています：

- `00_sam.md` - SAM 基礎知識とコンセプト
- `01_setup.md` - 詳細セットアップガイド
- `02_execution_log.md` - 実際の実行ログ
- `03_comparison.md` - Terraform との詳細比較

## 次のステップ

1. **カスタム関数**: Hello World 以外の機能実装
2. **データベース連携**: DynamoDB 統合
3. **認証機能**: API 認証の追加
4. **CI/CD**: 自動デプロイパイプライン
5. **モニタリング**: CloudWatch 統合

## ユニットテスト

テストは `hello-world/tests` フォルダに定義されています。NPM を使用してテストフレームワークをインストールし、ユニットテストを実行できます。

```bash
cd hello-world
npm install
npm run test
```

## 参考リソース

- [AWS SAM 開発者ガイド](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html) - SAM 仕様、SAM CLI、サーバーレスアプリケーションの概念
- [AWS Serverless Application Repository](https://aws.amazon.com/serverless/serverlessrepo/) - 実用的なサンプルアプリケーション

---

## ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。
