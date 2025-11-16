import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';

export class Project03Cdk02Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 📦 Step 1: S3バケットを作成（アップロード用と処理済み用）
    const uploadBucket = new s3.Bucket(this, 'UploadBucket', {
      bucketName: 'file-processor-uploads',
      removalPolicy: cdk.RemovalPolicy.DESTROY, // 学習用なので削除時にバケットも削除
      autoDeleteObjects: true, // バケット削除時にオブジェクトも自動削除
    });

    const processedBucket = new s3.Bucket(this, 'ProcessedBucket', {
      bucketName: 'file-processor-processed',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // 📬 Step 2: SQSキューを作成
    const fileQueue = new sqs.Queue(this, 'FileQueue', {
      queueName: 'file-processing-queue',
      visibilityTimeout: cdk.Duration.seconds(300), // Lambda実行時間に合わせる
      receiveMessageWaitTime: cdk.Duration.seconds(20), // ロングポーリング
    });

    // 🗄️ Step 3: DynamoDBテーブルを作成（ファイルメタデータ保存用）
    const fileMetadataTable = new dynamodb.Table(this, 'FileMetadataTable', {
      tableName: 'file-metadata',
      partitionKey: {
        name: 'fileId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // オンデマンド課金
      removalPolicy: cdk.RemovalPolicy.DESTROY, // 学習用なので削除可能に
    });

    // ⚡ Step 4: Lambda関数を作成
    const fileProcessor = new lambda.Function(this, 'FileProcessor', {
      functionName: 'file-processor',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'file-processor.handler',
      code: lambda.Code.fromAsset('lambda'),
      timeout: cdk.Duration.seconds(60),
      environment: {
        TABLE_NAME: fileMetadataTable.tableName,
        PROCESSED_BUCKET: processedBucket.bucketName,
        // LocalStack内部からは自動的にエンドポイントが設定される
        // 外部から呼び出す場合のみ明示的に設定
      },
    });

    // Lambda関数に権限を付与
    uploadBucket.grantRead(fileProcessor); // アップロードバケットから読み取り
    processedBucket.grantWrite(fileProcessor); // 処理済みバケットへ書き込み
    uploadBucket.grantDelete(fileProcessor); // 元ファイルの削除
    fileMetadataTable.grantWriteData(fileProcessor); // DynamoDBへ書き込み

    // 🔗 Step 5: S3イベント通知をSQSに送信
    // 通常の方法（本番AWS用）
    uploadBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.SqsDestination(fileQueue)
    );

    // 🔧 LocalStack用の回避策: L1コンストラクトを直接操作
    // Custom::S3BucketNotificationsがLocalStackでサポートされていないための対処
    const cfnBucket = uploadBucket.node.defaultChild as s3.CfnBucket;
    cfnBucket.notificationConfiguration = {
      queueConfigurations: [
        {
          event: 's3:ObjectCreated:*',
          queue: fileQueue.queueArn,
        },
      ],
    };

    // 🔗 Step 6: SQSをLambdaのトリガーに設定
    fileProcessor.addEventSource(
      new lambdaEventSources.SqsEventSource(fileQueue, {
        batchSize: 1, // 一度に処理するメッセージ数
      })
    );

    // 📤 出力: 後で使うための情報を出力
    new cdk.CfnOutput(this, 'UploadBucketName', {
      value: uploadBucket.bucketName,
      description: 'アップロード用S3バケット名',
    });

    new cdk.CfnOutput(this, 'ProcessedBucketName', {
      value: processedBucket.bucketName,
      description: '処理済みファイル用S3バケット名',
    });

    new cdk.CfnOutput(this, 'QueueUrl', {
      value: fileQueue.queueUrl,
      description: 'SQSキューURL',
    });

    new cdk.CfnOutput(this, 'TableName', {
      value: fileMetadataTable.tableName,
      description: 'DynamoDBテーブル名',
    });
  }
}
