# マイクロサービスアーキテクチャパターン学習ガイド

## 📚 このドキュメントについて

このプロジェクトで実装したマイクロサービスアーキテクチャのパターンと、なぜSQS（キューイング）を使うのか、その利点について学習します。

---

## 🎯 なぜSQSを使うのか？

### 問題：直接呼び出しの課題

もしSQSを使わず、Order Processor Lambdaから直接3つのサービス（Inventory、Notification、Billing）を呼び出すとどうなるでしょうか？

```typescript
// ❌ 悪い例：直接呼び出し（SQS無し）
async function processOrder(order: Order) {
  // 1. 注文を保存
  await saveOrder(order);

  // 2. 3つのサービスを直接呼び出し
  await inventoryService.updateStock(order);      // 失敗する可能性
  await notificationService.sendEmail(order);     // 失敗する可能性
  await billingService.processPayment(order);     // 失敗する可能性

  return { success: true };
}
```

**この方法の問題点：**

1. **同期処理で遅い**
   - 3つのサービスの処理が全て終わるまでユーザーを待たせる
   - 例：在庫チェック（2秒） + メール送信（3秒） + 請求処理（2秒） = **7秒待ち**
   - ユーザー体験が悪い

2. **エラー時の対処が難しい**
   - 在庫更新は成功したが、メール送信で失敗した場合、どうする？
   - 全体をロールバック？それとも一部だけリトライ？
   - エラーハンドリングのコードが複雑になる

3. **スケーラビリティの問題**
   - 注文が100件同時に来たら、300件（100 × 3サービス）のLambda実行が必要
   - リソースが足りなくなる可能性

4. **サービス間の依存関係が強い**
   - 1つのサービスがダウンすると、全体が失敗する
   - 「疎結合」ではなく「密結合」

---

## ✅ SQS + SNSを使うメリット

### 1. **非同期処理で高速レスポンス**

```typescript
// ✅ 良い例：SQS経由（このプロジェクトの実装）
async function processOrder(order: Order) {
  // 1. 注文を保存
  await saveOrder(order);

  // 2. SNSにイベントを発行するだけ（0.1秒）
  await sns.publish({
    TopicArn: 'order-events',
    Message: JSON.stringify(order),
  });

  // すぐにユーザーにレスポンスを返せる！
  return { success: true };  // ← 0.1秒で完了
}
```

**利点：**
- ユーザーは**0.1秒**でレスポンスを受け取れる
- 3つのサービスの処理は**バックグラウンドで並行実行**される
- ユーザー体験が大幅に向上

---

### 2. **自動的な負荷分散とスケーリング**

```
注文100件が同時に来た場合：

【SQS無し】
Order Processor → 100件 × 3サービス = 300件のLambda同時実行
↓
リソース不足で一部失敗

【SQS有り】
Order Processor → SNS → 3つのSQSキュー
                         ↓
                   各キューが自動的にバッファリング
                         ↓
                   Lambdaが処理可能なペースで実行（batchSize: 10）
                         ↓
                   全て確実に処理される
```

**利点：**
- **バッファリング効果**：急激なトラフィックを吸収
- **スロットリング防止**：Lambdaの同時実行数制限に引っかからない
- **コスト最適化**：必要な分だけLambdaを実行

---

### 3. **エラー時の自動リトライ**

SQSには**自動リトライ機能**があります。

```yaml
# このプロジェクトの設定
SQS Queue:
  VisibilityTimeout: 300秒（5分）
  MaxReceiveCount: 3回
  DeadLetterQueue: order-processing-dlq
```

**動作の流れ：**

```
1回目の処理：
  Inventory Service ← メッセージを受信
  ↓
  在庫更新処理
  ↓
  ❌ エラー発生（例：DynamoDBタイムアウト）
  ↓
  メッセージは削除されない（Visibility Timeout経過後に再度表示される）

2回目の処理（5分後）：
  Inventory Service ← 同じメッセージを再受信
  ↓
  在庫更新処理
  ↓
  ✅ 成功！
  ↓
  メッセージを削除
```

**利点：**
- **自動リトライ**：一時的なエラー（ネットワーク障害、タイムアウト）は自動的に回復
- **手動でリトライコードを書く必要がない**
- **確実な処理**：メッセージは少なくとも1回は処理される（At-Least-Once Delivery）

---

### 4. **疎結合（Loose Coupling）**

```
【密結合（SQS無し）】
Order Processor ──直接呼び出し→ Inventory Service
                              ↓（ダウン中）
                              ❌ 全体が失敗

【疎結合（SQS有り）】
Order Processor → SNS → SQS → Inventory Service
                               ↓（ダウン中）
                               メッセージはキューに残る
                               ↓（復旧後）
                               ✅ 自動的に処理再開
```

**利点：**
- **サービスの独立性**：1つのサービスがダウンしても他のサービスは影響を受けない
- **メンテナンスが容易**：サービスを停止しても、メッセージはキューに溜まるだけ
- **新しいサービスの追加が簡単**：新しいキューとサブスクリプションを追加するだけ

---

## 🔴 Dead Letter Queue (DLQ) とは？

### DLQの役割

**Dead Letter Queue（デッドレターキュー、DLQ）**は、**処理に失敗したメッセージを隔離する特別なキュー**です。

### なぜDLQが必要？

```
通常のフロー：
  SQS → Lambda → 処理成功 → メッセージ削除 ✅

エラーフロー（DLQ無し）：
  SQS → Lambda → エラー → リトライ → エラー → リトライ → エラー
  ↓
  無限ループ ❌
  ↓
  キューが詰まって他のメッセージも処理できない

エラーフロー（DLQ有り）：
  SQS → Lambda → エラー → リトライ → エラー → リトライ → エラー
  ↓
  3回失敗したらDLQに移動 ✅
  ↓
  通常キューは空になり、新しいメッセージを処理できる
```

### このプロジェクトでのDLQ設定

```typescript
// lib/project-03-cdk-03-stack.ts
const dlq = new sqs.Queue(this, 'OrderProcessingDLQ', {
  queueName: 'order-processing-dlq',
  retentionPeriod: Duration.days(14),  // 14日間保持
});

const inventoryQueue = new sqs.Queue(this, 'InventoryQueue', {
  queueName: 'inventory-queue',
  visibilityTimeout: Duration.seconds(300),
  deadLetterQueue: {
    queue: dlq,
    maxReceiveCount: 3,  // 3回失敗したらDLQへ
  },
});
```

### DLQに入るメッセージの例

**シナリオ1：在庫不足**
```json
{
  "orderId": "order-123",
  "items": [
    { "productId": "prod-999", "quantity": 100 }  // 在庫は10個しかない
  ]
}
```
→ 3回リトライしても在庫不足は解決しない → DLQへ

**シナリオ2：無効なデータ**
```json
{
  "orderId": null,  // ❌ 不正なデータ
  "items": []
}
```
→ 何回リトライしてもエラー → DLQへ

**シナリオ3：外部APIエラー**
- メール送信APIが永続的にダウンしている
- 決済APIが不正なレスポンスを返す

### DLQのメッセージをどう扱う？

**重要：このプロジェクトではDLQにメッセージが入るだけで、自動処理はしていません。**

実際のプロダクション環境では、以下のような対処が必要です：

#### 1. **監視・アラート設定（最重要）**

DLQにメッセージが入ったら**すぐに通知**を受け取る仕組みが必要です。

```typescript
// CloudWatch Alarmの設定例（CDK）
const dlqAlarm = new cloudwatch.Alarm(this, 'DLQAlarm', {
  metric: dlq.metricApproximateNumberOfMessagesVisible(),
  threshold: 1,  // 1件でもDLQに入ったらアラート
  evaluationPeriods: 1,
  alarmDescription: 'DLQにメッセージが入りました',
});

// SNSトピックでSlack/Email通知
const alarmTopic = new sns.Topic(this, 'AlarmTopic');
alarmTopic.addSubscription(
  new snsSubscriptions.EmailSubscription('admin@example.com')
);
dlqAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alarmTopic));
```

**通知内容の例：**
```
🚨 DLQアラート！

メッセージ数: 3件
キュー名: order-processing-dlq
時刻: 2025-01-19 10:30:00

すぐに確認してください：
https://console.aws.amazon.com/sqs/v2/home?region=us-east-1#/queues/order-processing-dlq
```

#### 2. **手動確認**

まず、DLQに何が入っているか確認します。

```bash
# DLQのメッセージを確認
awslocal sqs receive-message \
  --queue-url http://localhost:4566/000000000000/order-processing-dlq \
  --max-number-of-messages 10 \
  --attribute-names All

# メッセージの詳細を見る
awslocal sqs receive-message \
  --queue-url <dlq-url> \
  --message-attribute-names All \
  | jq '.Messages[0].Body | fromjson'
```

#### 3. **原因を分析**

CloudWatch Logsでエラー内容を確認します。

```bash
# Lambda関数のログを確認
awslocal logs tail /aws/lambda/inventory-service --follow

# エラーログを検索
awslocal logs filter-pattern /aws/lambda/inventory-service \
  --filter-pattern "ERROR" \
  --start-time $(date -u -d '1 hour ago' +%s)000
```

**よくあるエラーパターン：**
- **在庫不足**：リトライしても解決しない業務エラー
- **無効なデータ**：`null` や不正なフォーマット
- **外部API障害**：メールAPI、決済APIのダウン
- **タイムアウト**：処理に5分以上かかる
- **権限エラー**：DynamoDBへのアクセス権限がない

#### 4. **対処方法**

エラーの種類によって対処が異なります。

| エラー種類 | 対処方法 | 例 |
|-----------|----------|-----|
| **在庫不足** | 在庫補充後に再送信 | 在庫を100個追加してから再処理 |
| **外部API障害** | API復旧後に再送信 | メール送信APIが復旧したら再処理 |
| **無効なデータ** | データ修正 or 削除 | 不正なデータは削除、顧客に連絡 |
| **一時的エラー** | そのまま再送信 | ネットワークエラーは再試行 |
| **設計ミス** | コード修正後に再送信 | Lambdaコードを修正してデプロイ |

#### 5. **再処理の実装例**

**パターンA：Lambda関数で自動再処理（推奨）**

```typescript
// lambda/dlq-processor/src/index.ts
import { SQSClient, SendMessageCommand, DeleteMessageCommand, ReceiveMessageCommand } from '@aws-sdk/client-sqs';

const sqs = new SQSClient({});
const DLQ_URL = process.env.DLQ_URL!;
const ORIGINAL_QUEUE_URL = process.env.ORIGINAL_QUEUE_URL!;

export const handler = async () => {
  // DLQからメッセージを取得
  const result = await sqs.send(new ReceiveMessageCommand({
    QueueUrl: DLQ_URL,
    MaxNumberOfMessages: 10,
    WaitTimeSeconds: 20,
  }));

  if (!result.Messages || result.Messages.length === 0) {
    console.log('DLQは空です');
    return;
  }

  for (const message of result.Messages) {
    try {
      const body = JSON.parse(message.Body!);

      // ビジネスロジックでリトライ可能か判定
      if (await canRetry(body)) {
        // 元のキューに再送信
        await sqs.send(new SendMessageCommand({
          QueueUrl: ORIGINAL_QUEUE_URL,
          MessageBody: message.Body,
        }));

        // DLQから削除
        await sqs.send(new DeleteMessageCommand({
          QueueUrl: DLQ_URL,
          ReceiptHandle: message.ReceiptHandle,
        }));

        console.log(`メッセージを再送信しました: ${body.orderId}`);
      } else {
        console.log(`リトライ不可: ${body.orderId} - 手動対処が必要`);
        // Slackに通知
        await notifySlack(`手動対処が必要: Order ${body.orderId}`);
      }
    } catch (error) {
      console.error('再処理エラー:', error);
    }
  }
};

// リトライ可能か判定（ビジネスロジック）
async function canRetry(orderData: any): Promise<boolean> {
  // 例：在庫が補充されたかチェック
  const inventory = await checkInventory(orderData.items);
  return inventory.sufficient;
}
```

**パターンB：手動再処理スクリプト**

```typescript
// scripts/retry-dlq.ts
import { SQSClient, ReceiveMessageCommand, SendMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';

const sqs = new SQSClient({ endpoint: 'http://localhost:4566' });

async function retryDLQMessages() {
  const dlqUrl = 'http://localhost:4566/000000000000/order-processing-dlq';
  const inventoryQueueUrl = 'http://localhost:4566/000000000000/inventory-queue';

  console.log('DLQからメッセージを取得中...');

  const result = await sqs.send(new ReceiveMessageCommand({
    QueueUrl: dlqUrl,
    MaxNumberOfMessages: 10,
  }));

  if (!result.Messages || result.Messages.length === 0) {
    console.log('DLQは空です');
    return;
  }

  console.log(`${result.Messages.length}件のメッセージを発見`);

  for (const message of result.Messages) {
    const body = JSON.parse(message.Body!);
    console.log(`処理中: Order ${body.orderId}`);

    // ユーザーに確認
    const shouldRetry = await askUser(`Order ${body.orderId} を再処理しますか？ (y/n)`);

    if (shouldRetry) {
      // 元のキューに再送信
      await sqs.send(new SendMessageCommand({
        QueueUrl: inventoryQueueUrl,
        MessageBody: message.Body,
      }));

      // DLQから削除
      await sqs.send(new DeleteMessageCommand({
        QueueUrl: dlqUrl,
        ReceiptHandle: message.ReceiptHandle!,
      }));

      console.log('✅ 再送信しました');
    } else {
      console.log('⏭️  スキップしました');
    }
  }
}

retryDLQMessages().catch(console.error);
```

#### 6. **自動化のベストプラクティス**

**推奨構成：**

```
DLQ
 ↓
CloudWatch Alarm
 ↓
SNS Topic → Slack通知
 ↓
EventBridge Rule（毎時実行）
 ↓
DLQ Processor Lambda
 ↓
├─ リトライ可能 → 元のキューに再送信
└─ リトライ不可 → 管理画面に表示 + Slack通知
```

**CDK実装例：**

```typescript
// DLQ Processor Lambda（毎時実行）
const dlqProcessorLambda = new lambdaNodejs.NodejsFunction(this, 'DLQProcessor', {
  functionName: 'dlq-processor',
  entry: 'lambda/dlq-processor/src/index.ts',
  environment: {
    DLQ_URL: dlq.queueUrl,
    INVENTORY_QUEUE_URL: inventoryQueue.queueUrl,
  },
});

// 毎時実行するルール
new events.Rule(this, 'DLQProcessorSchedule', {
  schedule: events.Schedule.rate(Duration.hours(1)),
  targets: [new eventsTargets.LambdaFunction(dlqProcessorLambda)],
});

// DLQへのアクセス権限
dlq.grantConsumeMessages(dlqProcessorLambda);
inventoryQueue.grantSendMessages(dlqProcessorLambda);
```

#### 7. **管理画面での可視化（理想）**

実際のプロダクトでは、管理画面でDLQメッセージを確認・操作できるようにします。

```typescript
// フロントエンドの管理画面ページ例
// pages/admin/dlq.tsx

export default function DLQManagementPage() {
  const { dlqMessages, refetch } = useDLQMessages();

  return (
    <div>
      <h1>Dead Letter Queue 管理</h1>
      <p>失敗したメッセージ: {dlqMessages.length}件</p>

      <table>
        <thead>
          <tr>
            <th>Order ID</th>
            <th>エラー内容</th>
            <th>失敗回数</th>
            <th>最終試行時刻</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {dlqMessages.map((msg) => (
            <tr key={msg.messageId}>
              <td>{msg.orderId}</td>
              <td>{msg.errorReason}</td>
              <td>{msg.receiveCount}回</td>
              <td>{msg.timestamp}</td>
              <td>
                <button onClick={() => retryMessage(msg.messageId)}>
                  🔄 再処理
                </button>
                <button onClick={() => deleteMessage(msg.messageId)}>
                  🗑️ 削除
                </button>
                <button onClick={() => viewDetails(msg.messageId)}>
                  🔍 詳細
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 🏗️ SNS + SQS ファンアウトパターン

### このプロジェクトで使用しているアーキテクチャ

```
Order Processor Lambda
        ↓
      SNS Topic (order-events)
        ↓
     ┌──┴──┬──────┐
     ↓     ↓      ↓
  Queue1 Queue2 Queue3
     ↓     ↓      ↓
  Lambda1 Lambda2 Lambda3
```

### なぜSNS（Pub/Sub）を使うのか？

**パターン1：SQS直接送信（悪い例）**
```typescript
// Order Processorが3つのキューに直接送信
await sqs.sendMessage({ QueueUrl: inventoryQueueUrl, ... });
await sqs.sendMessage({ QueueUrl: notificationQueueUrl, ... });
await sqs.sendMessage({ QueueUrl: billingQueueUrl, ... });
```

**問題点：**
- Order Processorが全てのキューを知っている必要がある（密結合）
- 新しいサービスを追加するたびにOrder Processorを変更する必要がある
- 1つのキューへの送信が失敗したら、他のキューにも送信すべき？

**パターン2：SNS経由（良い例）**
```typescript
// Order ProcessorはSNSに1回発行するだけ
await sns.publish({
  TopicArn: orderEventsTopic,
  Message: JSON.stringify(order),
});
```

**利点：**
- Order Processorは「注文イベントを発行する」だけ
- 誰がそのイベントを購読しているかは知らなくて良い（疎結合）
- 新しいサービスを追加してもOrder Processorは変更不要
- **1対多の配信が簡単**（1つのイベント → 複数のサブスクライバー）

---

## 📊 このプロジェクトでの実際の動作

### 注文処理のフロー（タイムライン）

```
時刻 0秒：ユーザーが注文送信
  ↓
時刻 0.1秒：Order Processor Lambda起動
  - 注文をDynamoDB (orders-table) に保存
  - SNS Topic (order-events) にイベント発行
  - ユーザーにレスポンス返却 ✅（ここで完了！）

時刻 0.2秒：SNSが3つのSQSキューにメッセージ配信
  - inventory-queue にメッセージ追加
  - notification-queue にメッセージ追加
  - billing-queue にメッセージ追加

時刻 0.3秒：3つのLambdaが並行実行開始
  ┌─────────────────┬──────────────────┬─────────────────┐
  │ Inventory       │ Notification     │ Billing         │
  │ Service         │ Service          │ Service         │
  ├─────────────────┼──────────────────┼─────────────────┤
  │ 在庫チェック    │ メール送信       │ 税額計算        │
  │ 在庫更新        │ 通知履歴保存     │ 請求レコード作成│
  │ (2秒)           │ (3秒)            │ (2秒)           │
  └─────────────────┴──────────────────┴─────────────────┘

時刻 2.3秒：Inventory Service完了
  - inventory-table更新完了
  - メッセージ削除

時刻 2.3秒：Billing Service完了
  - billing-table更新完了
  - メッセージ削除

時刻 3.3秒：Notification Service完了
  - notifications-table更新完了
  - メッセージ削除

全体処理時間：3.3秒（並行処理のおかげ）
ユーザー待機時間：0.1秒（非同期処理のおかげ）
```

### エラー時の動作（在庫不足の場合）

```
時刻 0秒：ユーザーが注文送信（在庫不足の商品を注文）

時刻 0.1秒：Order Processor
  - 注文を保存
  - SNSにイベント発行
  - ユーザーにレスポンス ✅

時刻 0.3秒：Inventory Service（1回目）
  - 在庫チェック
  - ❌ 在庫不足エラー
  - メッセージは削除されない

時刻 5分0.3秒：Inventory Service（2回目、自動リトライ）
  - 在庫チェック
  - ❌ まだ在庫不足
  - メッセージは削除されない

時刻 10分0.3秒：Inventory Service（3回目、自動リトライ）
  - 在庫チェック
  - ❌ まだ在庫不足
  - 3回失敗 → DLQに移動

DLQ:
  - メッセージを14日間保持
  - 管理者が手動で確認・対処
  - CloudWatch Alarmsでアラート通知（実装可能）

他のサービス:
  - Notification Service: ✅ 成功（メール送信完了）
  - Billing Service: ✅ 成功（請求レコード作成完了）
  - 1つのサービスの失敗が他のサービスに影響しない！
```

---

## 🎓 学習ポイントまとめ

### SQSを使う理由

1. ✅ **非同期処理** → ユーザー待機時間が短い
2. ✅ **バッファリング** → 急激なトラフィックを吸収
3. ✅ **自動リトライ** → 一時的なエラーを自動回復
4. ✅ **疎結合** → サービス間の依存関係を減らす
5. ✅ **スケーラビリティ** → 自動的に負荷分散

### DLQを使う理由

1. ✅ **エラーメッセージの隔離** → 通常キューが詰まらない
2. ✅ **手動対処が可能** → 原因を分析して適切に対処
3. ✅ **データロス防止** → 失敗したメッセージも14日間保持
4. ✅ **監視・アラート** → 異常を早期発見

### SNSファンアウトパターンの利点

1. ✅ **1対多の配信** → 1つのイベント → 複数のサービス
2. ✅ **疎結合** → 発行者と購読者が独立
3. ✅ **拡張性** → 新しいサービス追加が簡単
4. ✅ **並行処理** → 複数サービスが同時実行

---

## 🚀 さらに学ぶために

### 実験してみよう

1. **並行処理の効果を確認**
   ```bash
   # 5件の注文を同時送信
   cd scripts
   ./test-concurrent.sh
   # → 全て1秒以内に完了（並行処理のおかげ）
   ```

2. **DLQの動作を確認**
   ```bash
   # 在庫不足の注文を送信
   ./test-inventory-error.sh
   # → DLQにメッセージが入ることを確認
   awslocal sqs receive-message --queue-url <dlq-url>
   ```

3. **リトライ動作を観察**
   - CloudWatch Logsで同じメッセージが3回処理される様子を確認
   - Visibility Timeoutの間はメッセージが見えないことを確認

### 関連する概念

- **At-Least-Once Delivery**：メッセージは少なくとも1回は配信される（重複の可能性）
- **Idempotency（冪等性）**：同じメッセージを複数回処理しても結果が同じになるように設計
- **Event Sourcing**：全てのイベントを記録する設計パターン
- **CQRS**：Command（書き込み）とQuery（読み取り）を分離する設計パターン

### 参考資料

- [AWS SQS Best Practices](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-best-practices.html)
- [AWS SNS Fanout Pattern](https://docs.aws.amazon.com/sns/latest/dg/sns-common-scenarios.html)
- [Microservices Patterns (Book)](https://microservices.io/patterns/index.html)

---

**🎉 このドキュメントで学んだことを活かして、スケーラブルで堅牢なマイクロサービスアーキテクチャを設計しましょう！**
