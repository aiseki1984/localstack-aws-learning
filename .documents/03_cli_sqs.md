# AWS CLI - SQS よく使うコマンド集

## 🔍 キュー操作

### キュー一覧を取得

```bash
aws sqs list-queues
```

### キューを作成

```bash
aws sqs create-queue --queue-name my-queue
```

### キューの URL を取得

```bash
aws sqs get-queue-url --queue-name my-queue
```

### キューを削除

```bash
aws sqs delete-queue --queue-url <QUEUE_URL>
```

---

## 📤 メッセージ送信

### メッセージを送信

```bash
aws sqs send-message \
  --queue-url <QUEUE_URL> \
  --message-body "Hello, SQS!"
```

---

## 📥 メッセージ受信

### メッセージを受信 (最大 10 件)

```bash
aws sqs receive-message \
  --queue-url <QUEUE_URL> \
  --max-number-of-messages 10
```

### 一覧表示のように使う (削除せず即再表示)

```bash
aws sqs receive-message \
  --queue-url <QUEUE_URL> \
  --max-number-of-messages 10 \
  --visibility-timeout 0 \
  --wait-time-seconds 0
```

---

## ❌ メッセージ削除

### メッセージを削除

```bash
aws sqs delete-message \
  --queue-url <QUEUE_URL> \
  --receipt-handle <RECEIPT_HANDLE>
```

---

## 📦 その他

### キューの属性を取得

```bash
aws sqs get-queue-attributes \
  --queue-url <QUEUE_URL> \
  --attribute-names All
```

### キューの属性を設定

```bash
aws sqs set-queue-attributes \
  --queue-url <QUEUE_URL> \
  --attributes VisibilityTimeout=60
```

---

## 📜 補說

- **QUEUE_URL**: `get-queue-url` で取得した URL
- **RECEIPT_HANDLE**: `receive-message` で取得したメッセージの receipt handle
- **VisibilityTimeout**: メッセージが「他から見えなくなる秒数」（デフォルト 30 秒）
