# イベント駆動型ファイル処理システム (CDK)

S3、SQS、Lambda、DynamoDB を使ったイベント駆動型アーキテクチャの学習プロジェクトです。

## アーキテクチャ

```
S3 (uploads) → S3 Event → SQS → Lambda → DynamoDB
                                    ↓
                           S3 (processed)
```

## 機能

1. S3 バケットにファイルをアップロード
2. S3 イベント通知が自動的に SQS にメッセージ送信
3. Lambda 関数が SQS からメッセージを受信して自動実行
4. ファイルメタデータを DynamoDB に保存
5. 処理済みファイルを別の S3 バケットに移動
6. 元のファイルを削除

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. ビルド

```bash
npm run build
```

### 3. LocalStack へデプロイ

```bash
cdklocal deploy --require-approval never
```

### 4. ⚠️ 重要: S3 イベント通知の手動設定

**LocalStack の制限**: CDK の `addEventNotification` は CloudFormation の `Custom::S3BucketNotifications` リソースを使用しますが、LocalStack の無料版ではこれがサポートされていません。そのため、デプロイ後に手動で S3 イベント通知を設定する必要があります。

```bash
bash scripts/setup-s3-notifications.sh
```

**注意**: 本番 AWS 環境では、この手動設定は不要です。CDK が自動的に設定します。

## 使い方

### ファイルをアップロードしてテスト

```bash
# テストファイルを作成してアップロード
echo "テストファイル" > /tmp/test.txt
awslocal s3 cp /tmp/test.txt s3://file-processor-uploads/test.txt

# 数秒待ってから結果を確認
sleep 5

# DynamoDB でメタデータを確認
awslocal dynamodb scan --table-name file-metadata --output table

# 処理済みバケットを確認
awslocal s3 ls s3://file-processor-processed/processed/

# 元のバケット（ファイルは削除されているはず）
awslocal s3 ls s3://file-processor-uploads/
```

### 自動テストスクリプト

```bash
bash scripts/test-file-processor.sh
```

## CDK コマンド

- `npm run build` - TypeScript をコンパイル
- `npm run watch` - 変更を監視して自動コンパイル
- `npm run test` - Jest ユニットテストを実行
- `cdklocal deploy` - LocalStack にデプロイ
- `cdklocal destroy` - スタックを削除
- `cdklocal diff` - 現在の状態との差分を表示
- `cdklocal synth` - CloudFormation テンプレートを生成

## リソース構成

### S3 バケット

- `file-processor-uploads` - ファイルアップロード用
- `file-processor-processed` - 処理済みファイル用

### SQS キュー

- `file-processing-queue` - ファイル処理メッセージキュー
  - Visibility Timeout: 300 秒
  - Long Polling: 20 秒

### DynamoDB テーブル

- `file-metadata` - ファイルメタデータ保存用
  - Partition Key: `fileId` (String)
  - Sort Key: `timestamp` (String)
  - Billing Mode: PAY_PER_REQUEST

### Lambda 関数

- `file-processor` - ファイル処理関数
  - Runtime: Node.js 20.x
  - Timeout: 60 秒
  - Handler: `file-processor.handler`

## 学習ポイント

### イベント駆動アーキテクチャ

- S3 イベント通知による非同期処理のトリガー
- SQS を使った疎結合なシステム設計
- Lambda の自動スケーリング

### AWS SDK 使用

- S3: `GetObjectCommand`, `CopyObjectCommand`, `DeleteObjectCommand`
- DynamoDB: `PutItemCommand`
- エラーハンドリングと再試行メカニズム

### IAM 権限管理

CDK の便利なメソッドで権限を自動付与:

```typescript
uploadBucket.grantRead(fileProcessor);
processedBucket.grantWrite(fileProcessor);
uploadBucket.grantDelete(fileProcessor);
fileMetadataTable.grantWriteData(fileProcessor);
```

## トラブルシューティング

### S3 イベント通知が動作しない

デプロイ後に `scripts/setup-s3-notifications.sh` を実行したか確認してください。

```bash
# 現在の設定を確認
awslocal s3api get-bucket-notification-configuration --bucket file-processor-uploads

# 設定がない場合は実行
bash scripts/setup-s3-notifications.sh
```

### Lambda が実行されない

SQS キューの状態を確認:

```bash
awslocal sqs get-queue-attributes \
  --queue-url http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/file-processing-queue \
  --attribute-names All | jq .Attributes
```

### Lambda のログを確認

```bash
awslocal logs tail /aws/lambda/file-processor --since 10m
```

## クリーンアップ

```bash
cdklocal destroy --force
```

## 次のステップ（発展課題）

1. SNS を追加して処理完了通知を送信
2. エラーハンドリングとデッドレターキュー (DLQ) の実装
3. Step Functions で複雑なワークフローを構築
4. 複数の Lambda 関数で並列処理
5. S3 Select でファイル内容の部分的な読み取り

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

### ステップ

- cdk プロジェクトの初期化
- CDK スタックの基本構造を作成
  - s3, sqs, dynamodb の定義
  - ここで一度ビルドして確かめる。
- lambda 関数のコードを作成
