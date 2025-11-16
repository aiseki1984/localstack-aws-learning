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

- [x] **Phase 1**: 基礎インフラ（DynamoDB、SNS、SQS）✅ **← 今ココ**
- [ ] **Phase 2**: Order Processor Lambda + API Gateway
- [ ] **Phase 3**: マイクロサービス Lambda（3 つ）
- [ ] **Phase 4**: テスト・動作確認

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
