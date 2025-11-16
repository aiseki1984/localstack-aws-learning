/**
 * ファイル処理Lambda関数
 * S3からファイルを取得し、メタデータをDynamoDBに保存し、処理済みバケットに移動
 */

const { S3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');

// LocalStack用のエンドポイント設定
// LocalStack内で実行される場合、AWS SDKは自動的にLocalStackのエンドポイントを使用
const s3Client = new S3Client({
  forcePathStyle: true, // LocalStackではパススタイルが必要
});
const dynamoClient = new DynamoDBClient({});

exports.handler = async (event) => {
  console.log('受信イベント:', JSON.stringify(event, null, 2));

  const processedFiles = [];
  const errors = [];

  // SQSからのメッセージを処理
  for (const record of event.Records) {
    try {
      // SQSメッセージのボディはS3イベント通知のJSON文字列
      const s3Event = JSON.parse(record.body);
      console.log('S3イベント:', JSON.stringify(s3Event, null, 2));

      // S3イベント内のレコードを処理
      for (const s3Record of s3Event.Records) {
        const bucketName = s3Record.s3.bucket.name;
        const objectKey = decodeURIComponent(s3Record.s3.object.key.replace(/\+/g, ' '));
        const fileSize = s3Record.s3.object.size;

        console.log(`処理中: バケット=${bucketName}, キー=${objectKey}, サイズ=${fileSize}`);

        // 1. S3からファイルメタデータを取得（実際の内容は取得しない、サイズが大きい可能性があるため）
        const getCommand = new GetObjectCommand({
          Bucket: bucketName,
          Key: objectKey,
        });
        const s3Object = await s3Client.send(getCommand);

        // 2. メタデータをDynamoDBに保存
        const fileId = objectKey.split('/').pop() || objectKey;
        const timestamp = new Date().toISOString();
        
        const putCommand = new PutItemCommand({
          TableName: process.env.TABLE_NAME,
          Item: {
            fileId: { S: fileId },
            timestamp: { S: timestamp },
            originalBucket: { S: bucketName },
            originalKey: { S: objectKey },
            fileSize: { N: fileSize.toString() },
            contentType: { S: s3Object.ContentType || 'application/octet-stream' },
            processedAt: { S: timestamp },
            status: { S: 'processed' },
          },
        });
        
        await dynamoClient.send(putCommand);
        console.log('DynamoDBに保存しました:', fileId);

        // 3. ファイルを処理済みバケットにコピー
        const processedKey = `processed/${fileId}`;
        const copyCommand = new CopyObjectCommand({
          Bucket: process.env.PROCESSED_BUCKET,
          CopySource: `${bucketName}/${objectKey}`,
          Key: processedKey,
        });
        
        await s3Client.send(copyCommand);
        console.log('処理済みバケットにコピーしました:', processedKey);

        // 4. 元のファイルを削除（オプション）
        const deleteCommand = new DeleteObjectCommand({
          Bucket: bucketName,
          Key: objectKey,
        });
        
        await s3Client.send(deleteCommand);
        console.log('元のファイルを削除しました:', objectKey);

        processedFiles.push({
          fileId,
          originalKey: objectKey,
          processedKey,
          size: fileSize,
        });
      }
    } catch (error) {
      console.error('エラー:', error);
      errors.push({
        messageId: record.messageId,
        error: error.message,
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
