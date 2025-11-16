# 📦 E-コマース注文処理システム（マイクロサービスパターン）

**学習目的**: SNS ファンアウト、マイクロサービスアーキテクチャ、非同期処理

## 🎯 システム概要

顧客の注文を受け取り、複数の独立したマイクロサービスが並行処理を実行するシステム。

```
顧客の注文
    ↓
API Gateway (POST /orders)
    ↓
Order Processor Lambda
    ↓
SNS Topic (order-events) ← ファンアウトハブ
    ↓ (並行配信)
    ├─→ SQS → Inventory Service Lambda (在庫確認・引き当て)
    ├─→ SQS → Notification Service Lambda (顧客通知)
    └─→ SQS → Billing Service Lambda (請求処理)
```

## 🏗️ アーキテクチャコンポーネント

### DynamoDB テーブル

- **orders** - 注文情報（PK: orderId, SK: createdAt）
- **inventory** - 在庫情報（PK: productId）
- **notifications** - 通知履歴（PK: notificationId, SK: createdAt）
- **billing** - 請求情報（PK: billingId, SK: orderId）

### SNS/SQS

- **SNS Topic**: `order-events` - イベント配信ハブ
- **SQS Queues**:
  - `inventory-queue` - 在庫サービス用
  - `notification-queue` - 通知サービス用
  - `billing-queue` - 請求サービス用
  - `order-processing-dlq` - エラーメッセージ保管（DLQ）

### Lambda 関数（予定）

1. **Order Processor** - 注文受付・SNS 発行
2. **Inventory Service** - 在庫確認・引き当て
3. **Notification Service** - 顧客通知
4. **Billing Service** - 請求処理

## 📝 実装ステップ

### ✅ Phase 1: 基礎インフラ構築（完了）

**目的**: イベント駆動アーキテクチャの土台を作る

- DynamoDB テーブル 4 つを作成（各マイクロサービス用のデータストア）
- SNS Topic を作成（イベントのファンアウトハブとして機能）
- SQS キュー 3 つ + DLQ を作成（マイクロサービス間の疎結合通信）
- SNS → SQS のサブスクリプション設定（1 イベントを複数サービスに配信）
- 初期データ投入スクリプト作成（テスト用の商品在庫データ）

### 🚧 Phase 2: Order Processor Lambda + API Gateway（次のステップ）

**目的**: 注文受付のエントリポイントを作る

- API Gateway REST API を作成（POST /orders エンドポイント）
- Order Processor Lambda 関数を実装（TypeScript、NodejsFunction で自動ビルド）
- 注文データのバリデーション処理（必須フィールド、データ型チェック）
- orders テーブルへの保存処理（注文 ID 生成、タイムスタンプ付与）
- SNS への注文イベント発行（JSON ペイロードでファンアウト）

### 🚧 Phase 3: マイクロサービス Lambda（3 つ）

**目的**: 独立した複数のサービスで並行処理を実現

#### 3-1. Inventory Service Lambda

- SQS（inventory-queue）をトリガーに設定
- 商品 ID で在庫テーブルを検索し、在庫数をチェック
- 在庫がある場合は引き当て処理（stock - quantity で更新）
- 在庫不足の場合はエラーログ出力（他サービスには影響させない）
- 処理結果を inventory テーブルに記録（処理履歴として）

#### 3-2. Notification Service Lambda

- SQS（notification-queue）をトリガーに設定
- 顧客へのメール通知をシミュレート（実際はログ出力）
- SMS 通知をシミュレート（実際はログ出力）
- 通知履歴を notifications テーブルに保存（送信日時、宛先、内容）
- 通知失敗時のリトライ処理（SQS の自動リトライ機能を活用）

#### 3-3. Billing Service Lambda

- SQS（billing-queue）をトリガーに設定
- 注文金額の計算処理（商品価格 × 数量の合計）
- 決済処理のシミュレート（実際はログ出力）
- 請求情報を billing テーブルに記録（請求 ID、注文 ID、金額、ステータス）
- 決済エラー時の DLQ 送信処理（3 回失敗で自動的に DLQ へ）

### 🚧 Phase 4: テスト・動作確認

**目的**: システム全体のエンドツーエンドテストを実施

- テストスクリプト作成（curl で API Gateway にリクエスト送信）
- 正常フローのテスト（在庫あり → 全サービス成功を確認）
- エラーフローのテスト（在庫切れ商品の注文で Inventory Service のみ失敗）
- 並行処理のテスト（複数注文を同時送信してファンアウトを確認）
- DLQ の動作確認（意図的にエラーを発生させて DLQ への転送を確認）

## 🚀 デプロイ手順

### 前提条件

- LocalStack が起動していること
- cdklocal がインストール済み

### デプロイ

```bash
# 依存関係インストール
npm install

# TypeScriptコンパイル
npm run build

# LocalStackにデプロイ
cdklocal deploy --require-approval never
```

### 動作確認

```bash
# すべてのリソースを確認
bash scripts/check-resources.sh

# 初期データ（在庫情報）を投入
bash scripts/seed-data.sh
```

## 📚 学習ポイント

- ✅ **Pub/Sub パターン**: SNS で 1 イベント → 複数サービスに配信
- ✅ **ファンアウト**: 並行処理による高速化
- ✅ **サービス分離**: 各マイクロサービスの独立性
- ✅ **非同期処理**: SQS による疎結合アーキテクチャ
- ✅ **エラーハンドリング**: DLQ（Dead Letter Queue）による信頼性向上

## 🧪 テストシナリオ（予定）

1. **正常フロー**: 在庫あり → 全サービス成功
2. **在庫不足**: Inventory Service がエラー → 他サービスは継続
3. **並行処理**: 複数注文の同時処理確認

## 📖 Useful commands

- `npm run build` - TypeScript コンパイル
- `npm run watch` - 変更監視＆自動コンパイル
- `npm run test` - Jest ユニットテスト
- `cdklocal deploy` - LocalStack にデプロイ
- `cdklocal destroy` - スタック削除
