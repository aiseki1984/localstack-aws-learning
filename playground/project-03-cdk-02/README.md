# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `npx cdk deploy` deploy this stack to your default AWS account/region
- `npx cdk diff` compare deployed stack with current state
- `npx cdk synth` emits the synthesized CloudFormation template

## おすすめアーキテクチャ 3 選

- 1. イベント駆動型ファイル処理システム ⭐ おすすめ
  - S3 → SQS → Lambda → DynamoDB
  - 学べること: イベント駆動アーキテクチャ、非同期処理、メッセージキュー
  - ユースケース: 画像アップロード → サムネイル生成、CSV ファイル → データベースインポート
  - 使用サービス: S3, SQS, Lambda, DynamoDB
- 2. マイクロサービス間通信パターン
  - API Gateway → Lambda → SNS → [SQS → Lambda] × 複数
  - 学べること: Pub/Sub パターン、ファンアウト、サービス分離
  - ユースケース: 注文処理 → 在庫管理、通知、請求の各サービスへ配信
  - 使用サービス: API Gateway, Lambda, SNS, SQS, DynamoDB
- 3. シンプルなバッチ処理システム
  - S3 → SQS → Lambda → DynamoDB
  - 学べること: スケジュール実行、バッチ処理、データパイプライン
  - ユースケース: 毎日のレポート生成、データ集計
  - 使用サービス: EventBridge, Lambda, S3, SQS, DynamoDB

## イベント駆動型ファイル処理システム

```
// プロジェクト構成例
S3バケット (uploads/)
  ↓ S3イベント通知
SQSキュー
  ↓ ポーリング
Lambda関数 (processor)
  ↓ 処理結果を保存
DynamoDB + S3 (processed/)
```

### 実装する機能

1. S3 にファイルアップロード
2. 自動的に SQS にメッセージ送信
3. Lambda がメッセージを処理
4. メタデータを DynamoDB に保存
5. 処理済みファイルを別の S3 バケットに移動
