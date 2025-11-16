# CDK と LocalStack の互換性問題と回避策

LocalStack の無料版で CDK を使用する際に遭遇する問題と、その解決方法をまとめたドキュメントです。

## 目次

1. [カスタムリソースの制限](#カスタムリソースの制限)
2. [S3 イベント通知の設定](#s3-イベント通知の設定)
3. [L1 コンストラクトの活用](#l1-コンストラクトの活用)
4. [その他の回避策](#その他の回避策)

---

## カスタムリソースの制限

### 問題

LocalStack の無料版では、CloudFormation の**カスタムリソース（Custom Resources）**がサポートされていません。

CDK の高レベル API（L2/L3 コンストラクト）は、内部でカスタムリソースを使用することがあります。例：

- `Custom::S3BucketNotifications` - S3 イベント通知
- `Custom::S3AutoDeleteObjects` - S3 バケット削除時のオブジェクト自動削除
- その他の高度な機能

### 症状

デプロイ時に以下のようなメッセージが表示されます：

```
Resource type Custom::S3BucketNotifications is not supported but was deployed as a fallback
```

リソースは `CREATE_COMPLETE` になりますが、実際には何も設定されていません。

### 対処方針

1. **L1 コンストラクト（Cfn\*クラス）を直接操作**して CloudFormation テンプレートを制御
2. デプロイ後に AWS CLI で手動設定（自動化スクリプトを作成）
3. LocalStack Pro を使用（有料）

---

## S3 イベント通知の設定

### 問題の詳細

CDK の `addEventNotification()` メソッドは、内部で `Custom::S3BucketNotifications` カスタムリソースを使用します。

```typescript
// ❌ LocalStack 無料版では動作しない
uploadBucket.addEventNotification(
  s3.EventType.OBJECT_CREATED,
  new s3n.SqsDestination(fileQueue)
);
```

### 解決策 1: L1 コンストラクトを使用（推奨）

**SQS へのイベント通知**

```typescript
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';

// L2 コンストラクトでバケットとキューを作成
const uploadBucket = new s3.Bucket(this, 'UploadBucket', {
  bucketName: 'my-upload-bucket',
});

const fileQueue = new sqs.Queue(this, 'FileQueue', {
  queueName: 'file-processing-queue',
});

// 通常の CDK の書き方（本番 AWS 用）
uploadBucket.addEventNotification(
  s3.EventType.OBJECT_CREATED,
  new s3n.SqsDestination(fileQueue)
);

// 🔧 LocalStack 用の回避策
const cfnBucket = uploadBucket.node.defaultChild as s3.CfnBucket;
cfnBucket.notificationConfiguration = {
  queueConfigurations: [
    {
      event: 's3:ObjectCreated:*',
      queue: fileQueue.queueArn,
    },
  ],
};
```

**Lambda へのイベント通知**

```typescript
import * as lambda from 'aws-cdk-lib/aws-lambda';

const myFunction = new lambda.Function(this, 'MyFunction', {
  // ... function config
});

// 通常の CDK の書き方
uploadBucket.addEventNotification(
  s3.EventType.OBJECT_CREATED,
  new s3n.LambdaDestination(myFunction)
);

// 🔧 LocalStack 用の回避策
const cfnBucket = uploadBucket.node.defaultChild as s3.CfnBucket;
cfnBucket.notificationConfiguration = {
  lambdaConfigurations: [
    {
      event: 's3:ObjectCreated:*',
      function: myFunction.functionArn,
    },
  ],
};
```

**SNS へのイベント通知**

```typescript
import * as sns from 'aws-cdk-lib/aws-sns';

const topic = new sns.Topic(this, 'MyTopic');

// 通常の CDK の書き方
uploadBucket.addEventNotification(
  s3.EventType.OBJECT_CREATED,
  new s3n.SnsDestination(topic)
);

// 🔧 LocalStack 用の回避策
const cfnBucket = uploadBucket.node.defaultChild as s3.CfnBucket;
cfnBucket.notificationConfiguration = {
  topicConfigurations: [
    {
      event: 's3:ObjectCreated:*',
      topic: topic.topicArn,
    },
  ],
};
```

### 解決策 2: デプロイ後に手動設定

デプロイ後に AWS CLI で設定するスクリプトを作成します。

```bash
#!/bin/bash

BUCKET_NAME="my-upload-bucket"
QUEUE_ARN="arn:aws:sqs:us-east-1:000000000000:file-processing-queue"

# イベント通知設定
awslocal s3api put-bucket-notification-configuration \
  --bucket ${BUCKET_NAME} \
  --notification-configuration '{
    "QueueConfigurations": [
      {
        "QueueArn": "'${QUEUE_ARN}'",
        "Events": ["s3:ObjectCreated:*"]
      }
    ]
  }'
```

### 設定の確認

```bash
awslocal s3api get-bucket-notification-configuration \
  --bucket my-upload-bucket
```

正しく設定されている場合の出力：

```json
{
  "QueueConfigurations": [
    {
      "Id": "...",
      "QueueArn": "arn:aws:sqs:us-east-1:000000000000:file-processing-queue",
      "Events": ["s3:ObjectCreated:*"]
    }
  ]
}
```

---

## L1 コンストラクトの活用

### L1、L2、L3 コンストラクトとは

CDK には 3 つのレベルのコンストラクトがあります：

| レベル | クラス名       | 説明                                             | 例             |
| ------ | -------------- | ------------------------------------------------ | -------------- |
| L1     | `Cfn*`         | CloudFormation リソースの直接マッピング          | `s3.CfnBucket` |
| L2     | 通常のクラス名 | 便利なメソッド付き、デフォルト設定あり           | `s3.Bucket`    |
| L3     | パターン       | 複数リソースを組み合わせたベストプラクティス実装 | `patterns.*`   |

### L2 から L1 コンストラクトへのアクセス

```typescript
// L2 コンストラクトを作成
const bucket = new s3.Bucket(this, 'MyBucket', {
  bucketName: 'my-bucket',
});

// L1 コンストラクトにアクセス
const cfnBucket = bucket.node.defaultChild as s3.CfnBucket;

// L1 のプロパティを直接設定
cfnBucket.websiteConfiguration = {
  indexDocument: 'index.html',
  errorDocument: 'error.html',
};
```

### 使用例

**DynamoDB テーブルの細かい設定**

```typescript
const table = new dynamodb.Table(this, 'MyTable', {
  partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
});

const cfnTable = table.node.defaultChild as dynamodb.CfnTable;
cfnTable.sseSpecification = {
  sseEnabled: true,
  sseType: 'KMS',
  kmsMasterKeyId: 'my-key-id',
};
```

**Lambda 関数の環境変数を動的に追加**

```typescript
const fn = new lambda.Function(this, 'MyFunction', {
  // ... config
});

const cfnFunction = fn.node.defaultChild as lambda.CfnFunction;

// 既存の環境変数に追加
if (cfnFunction.environment) {
  cfnFunction.environment = {
    variables: {
      ...(cfnFunction.environment as any).variables,
      CUSTOM_VAR: 'custom-value',
    },
  };
}
```

---

## その他の回避策

### 1. autoDeleteObjects の制限

**問題**: `autoDeleteObjects: true` は `Custom::S3AutoDeleteObjects` を使用します。

**回避策**: デプロイ前にバケットを空にするスクリプトを用意

```bash
#!/bin/bash
BUCKET_NAME="my-bucket"

# バケット内のすべてのオブジェクトを削除
awslocal s3 rm s3://${BUCKET_NAME} --recursive

# スタックを削除
cdklocal destroy --force
```

### 2. 条件付きロジック

環境変数で LocalStack かどうかを判定し、コードを分岐させます。

```typescript
export class MyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const isLocalStack = process.env.CDK_DEFAULT_ACCOUNT === '000000000000';

    const bucket = new s3.Bucket(this, 'MyBucket', {
      bucketName: 'my-bucket',
    });

    if (isLocalStack) {
      // LocalStack 用の設定
      const cfnBucket = bucket.node.defaultChild as s3.CfnBucket;
      cfnBucket.notificationConfiguration = {
        // ...
      };
    } else {
      // 本番 AWS 用の設定
      bucket
        .addEventNotification
        // ...
        ();
    }
  }
}
```

### 3. CDK Aspects の活用

複数のスタックで同じ回避策を適用する場合、Aspects を使うと便利です。

```typescript
import { IAspect, IConstruct } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';

class LocalStackS3NotificationAspect implements IAspect {
  constructor(private queueArn: string) {}

  visit(node: IConstruct): void {
    if (node instanceof s3.Bucket) {
      const cfnBucket = node.node.defaultChild as s3.CfnBucket;
      cfnBucket.notificationConfiguration = {
        queueConfigurations: [
          {
            event: 's3:ObjectCreated:*',
            queue: this.queueArn,
          },
        ],
      };
    }
  }
}

// 使用例
const app = new cdk.App();
const stack = new MyStack(app, 'MyStack');

if (process.env.CDK_DEFAULT_ACCOUNT === '000000000000') {
  cdk.Aspects.of(stack).add(
    new LocalStackS3NotificationAspect('arn:aws:sqs:...')
  );
}
```

---

## ベストプラクティス

### 1. 両方のコードを残す

本番 AWS とも互換性を保つため、両方のコードを記述します：

```typescript
// 本番 AWS 用（ドキュメントとしても機能）
uploadBucket.addEventNotification(
  s3.EventType.OBJECT_CREATED,
  new s3n.SqsDestination(fileQueue)
);

// LocalStack 用
const cfnBucket = uploadBucket.node.defaultChild as s3.CfnBucket;
cfnBucket.notificationConfiguration = {
  queueConfigurations: [
    {
      event: 's3:ObjectCreated:*',
      queue: fileQueue.queueArn,
    },
  ],
};
```

### 2. コメントで説明

回避策を使用している箇所には、必ずコメントで理由を記載します：

```typescript
// 🔧 LocalStack の制限により L1 コンストラクトを直接操作
// 参考: https://github.com/localstack/localstack/issues/9352
```

### 3. README に記載

プロジェクトの README に LocalStack での制限と使い方を明記します。

---

## トラブルシューティング

### CloudFormation スタックで確認

```bash
awslocal cloudformation describe-stack-resources \
  --stack-name YourStackName \
  --query 'StackResources[?ResourceType==`Custom::S3BucketNotifications`]'
```

`ResourceStatusReason` に "not supported but was deployed as a fallback" と表示される場合、カスタムリソースが動作していません。

### デプロイされたテンプレートを確認

```bash
cdklocal synth > template.yaml
cat template.yaml | grep -A 10 NotificationConfiguration
```

L1 コンストラクトで設定した内容が CloudFormation テンプレートに反映されているか確認します。

---

## 参考リンク

- [LocalStack Issue #9352 - Custom Resources Support](https://github.com/localstack/localstack/issues/9352)
- [CDK L1 Constructs Documentation](https://docs.aws.amazon.com/cdk/v2/guide/constructs.html#constructs_l1_using)
- [AWS CDK API Reference](https://docs.aws.amazon.com/cdk/api/v2/)

---

## まとめ

LocalStack の無料版で CDK を使用する際は、以下の点に注意：

- ✅ カスタムリソースは使用できない
- ✅ L1 コンストラクト（Cfn\*）で直接 CloudFormation を操作
- ✅ 本番 AWS 用のコードも残しておく
- ✅ README やコメントで回避策を文書化

この回避策により、LocalStack でも CDK の便利な機能を活用しながら、イベント駆動型アーキテクチャを実装できます。
