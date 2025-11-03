import { describe, it, expect, beforeAll } from 'vitest';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  CreateTableCommand,
  DeleteTableCommand,
} from '@aws-sdk/lib-dynamodb';
import { putUser, getUser } from './index';

// LocalStack用の設定
const client = new DynamoDBClient({
  region: 'us-east-1',
  endpoint: 'http://localhost:4566',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  },
});

const dynamodb = DynamoDBDocumentClient.from(client);

describe('DynamoDB Integration Tests', () => {
  const tableName = 'test-users';

  beforeAll(async () => {
    // テスト用テーブルの作成
    try {
      await client.send(
        new CreateTableCommand({
          TableName: tableName,
          KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
          AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
          BillingMode: 'PAY_PER_REQUEST',
        })
      );

      // テーブル作成の待機
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      // テーブルが既に存在する場合は無視
      console.log('Table might already exist:', error);
    }

    // 環境変数設定
    process.env.TABLE_NAME = tableName;
    process.env.AWS_REGION = 'us-east-1';
    process.env.LOCALSTACK_HOSTNAME = 'localhost';
  });

  it('should put and get a user from DynamoDB', async () => {
    const testUser = {
      id: 'integration-test-1',
      name: 'Integration Test User',
      email: 'test@integration.com',
    };

    // ユーザーを作成
    const createdUser = await putUser(testUser);
    expect(createdUser).toMatchObject(testUser);
    expect(createdUser.createdAt).toBeTruthy();

    // ユーザーを取得
    const retrievedUser = await getUser(testUser.id);
    expect(retrievedUser).toEqual(createdUser);
  });

  it('should return null for non-existent user', async () => {
    const result = await getUser('non-existent-id');
    expect(result).toBeNull();
  });
});
