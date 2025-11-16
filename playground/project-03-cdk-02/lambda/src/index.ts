/**
 * ファイル処理Lambda関数
 * S3からファイルを取得し、メタデータをDynamoDBに保存し、処理済みバケットに移動
 */

import { S3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { SQSEvent } from 'aws-lambda';

// クライアントの型定義
export interface Clients {
  s3: S3Client;
  dynamodb: DynamoDBClient;
}

// 環境変数の型定義
export interface ProcessorConfig {
  tableName: string;
  processedBucket: string;
}

// デフォルトのクライアント設定
const createDefaultClients = (): Clients => ({
  s3: new S3Client({
    forcePathStyle: true, // LocalStackではパススタイルが必要
  }),
  dynamodb: new DynamoDBClient({}),
});

// S3イベント通知の型定義
interface S3EventNotification {
  Records: Array<{
    eventVersion: string;
    eventSource: string;
    awsRegion: string;
    eventTime: string;
    eventName: string;
    s3: {
      bucket: {
        name: string;
      };
      object: {
        key: string;
        size: number;
      };
    };
  }>;
}

// 処理結果の型定義
interface ProcessedFile {
  fileId: string;
  originalKey: string;
  processedKey: string;
  size: number;
}

interface ProcessingError {
  messageId: string;
  error: string;
}

interface LambdaResponse {
  statusCode: number;
  body: string;
}

/**
 * ファイルIDを取得（パスの最後の部分）
 */
export const extractFileId = (objectKey: string): string => {
  return objectKey.split('/').pop() || objectKey;
};

/**
 * S3からファイルメタデータを取得
 */
export const getFileMetadata = async (
  s3Client: S3Client,
  bucketName: string,
  objectKey: string
) => {
  const getCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: objectKey,
  });
  return await s3Client.send(getCommand);
};

/**
 * DynamoDBにメタデータを保存
 */
export const saveMetadataToDynamoDB = async (
  dynamoClient: DynamoDBClient,
  config: ProcessorConfig,
  fileData: {
    fileId: string;
    bucketName: string;
    objectKey: string;
    fileSize: number;
    contentType: string;
  }
) => {
  const timestamp = new Date().toISOString();

  const putCommand = new PutItemCommand({
    TableName: config.tableName,
    Item: {
      fileId: { S: fileData.fileId },
      timestamp: { S: timestamp },
      originalBucket: { S: fileData.bucketName },
      originalKey: { S: fileData.objectKey },
      fileSize: { N: fileData.fileSize.toString() },
      contentType: { S: fileData.contentType },
      processedAt: { S: timestamp },
      status: { S: 'processed' },
    },
  });

  await dynamoClient.send(putCommand);
  console.log('DynamoDBに保存しました:', fileData.fileId);
};

/**
 * ファイルを処理済みバケットにコピー
 */
export const copyToProcessedBucket = async (
  s3Client: S3Client,
  config: ProcessorConfig,
  sourceBucket: string,
  sourceKey: string,
  fileId: string
) => {
  const processedKey = `processed/${fileId}`;
  const copyCommand = new CopyObjectCommand({
    Bucket: config.processedBucket,
    CopySource: `${sourceBucket}/${sourceKey}`,
    Key: processedKey,
  });

  await s3Client.send(copyCommand);
  console.log('処理済みバケットにコピーしました:', processedKey);
  return processedKey;
};

/**
 * 元のファイルを削除
 */
export const deleteOriginalFile = async (
  s3Client: S3Client,
  bucketName: string,
  objectKey: string
) => {
  const deleteCommand = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: objectKey,
  });

  await s3Client.send(deleteCommand);
  console.log('元のファイルを削除しました:', objectKey);
};

/**
 * 1つのS3ファイルを処理
 */
export const processS3File = async (
  clients: Clients,
  config: ProcessorConfig,
  s3Record: S3EventNotification['Records'][0]
): Promise<ProcessedFile> => {
  const bucketName = s3Record.s3.bucket.name;
  const objectKey = decodeURIComponent(s3Record.s3.object.key.replace(/\+/g, ' '));
  const fileSize = s3Record.s3.object.size;

  console.log(`処理中: バケット=${bucketName}, キー=${objectKey}, サイズ=${fileSize}`);

  // 1. S3からファイルメタデータを取得
  const s3Object = await getFileMetadata(clients.s3, bucketName, objectKey);

  // 2. メタデータをDynamoDBに保存
  const fileId = extractFileId(objectKey);
  await saveMetadataToDynamoDB(clients.dynamodb, config, {
    fileId,
    bucketName,
    objectKey,
    fileSize,
    contentType: s3Object.ContentType || 'application/octet-stream',
  });

  // 3. ファイルを処理済みバケットにコピー
  const processedKey = await copyToProcessedBucket(
    clients.s3,
    config,
    bucketName,
    objectKey,
    fileId
  );

  // 4. 元のファイルを削除
  await deleteOriginalFile(clients.s3, bucketName, objectKey);

  return {
    fileId,
    originalKey: objectKey,
    processedKey,
    size: fileSize,
  };
};

/**
 * SQSイベントを処理（テスト可能な内部関数）
 */
export const processEvent = async (
  event: SQSEvent,
  clients: Clients,
  config: ProcessorConfig
): Promise<LambdaResponse> => {
  console.log('受信イベント:', JSON.stringify(event, null, 2));

  const processedFiles: ProcessedFile[] = [];
  const errors: ProcessingError[] = [];

  // SQSからのメッセージを処理
  for (const record of event.Records) {
    try {
      // SQSメッセージのボディはS3イベント通知のJSON文字列
      const s3Event: S3EventNotification = JSON.parse(record.body);
      console.log('S3イベント:', JSON.stringify(s3Event, null, 2));

      // S3イベント内のレコードを処理
      for (const s3Record of s3Event.Records) {
        const result = await processS3File(clients, config, s3Record);
        processedFiles.push(result);
      }
    } catch (error) {
      console.error('エラー:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push({
        messageId: record.messageId,
        error: errorMessage,
      });
      // エラーが発生した場合、SQSメッセージは再処理される
      throw error;
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'ファイル処理完了',
      processedFiles,
      errors,
    }),
  };
};

/**
 * Lambda handler（エントリポイント）
 */
export const handler = async (event: SQSEvent): Promise<LambdaResponse> => {
  const clients = createDefaultClients();
  const config: ProcessorConfig = {
    tableName: process.env.TABLE_NAME!,
    processedBucket: process.env.PROCESSED_BUCKET!,
  };

  return processEvent(event, clients, config);
};
