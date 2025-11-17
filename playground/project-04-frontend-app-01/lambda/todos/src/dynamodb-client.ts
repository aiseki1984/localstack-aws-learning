import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

/**
 * DynamoDBクライアントの初期化
 * LocalStack環境に対応したエンドポイント設定を含む
 */
export function createDynamoDBClient(): DynamoDBDocumentClient {
  // 環境変数からエンドポイントURLを取得
  const endpoint = process.env.AWS_ENDPOINT_URL;

  // 基本的なDynamoDBクライアントの作成
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    ...(endpoint && {
      endpoint,
      // LocalStack用の追加設定
      forcePathStyle: true,
    }),
  });

  // DocumentClientでラップ（簡易的なデータ型変換を提供）
  const docClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
      // undefined値を自動的に削除
      removeUndefinedValues: true,
      // 空文字列を変換
      convertEmptyValues: false,
    },
    unmarshallOptions: {
      // DynamoDBのネイティブ型をJavaScript型に変換
      wrapNumbers: false,
    },
  });

  return docClient;
}

/**
 * テーブル名を環境変数から取得
 */
export function getTableName(): string {
  const tableName = process.env.TABLE_NAME || 'posts-table';
  return tableName;
}
