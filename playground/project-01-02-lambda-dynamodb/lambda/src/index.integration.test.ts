import { describe, it, expect, beforeAll } from 'vitest';
import {
  DynamoDBClient,
  CreateTableCommand,
  DeleteTableCommand,
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { putUser, getUser } from './index';

// テスト用の環境変数設定
const testEnv = {
  AWS_ACCESS_KEY_ID: 'test',
  AWS_SECRET_ACCESS_KEY: 'test',
  AWS_REGION: 'us-east-1',
  TABLE_NAME: 'test-users',
  LOCALSTACK_HOSTNAME: 'localhost',
};

// 環境変数を設定
Object.assign(process.env, testEnv);

// LocalStackエンドポイントを取得（Docker環境では localstack、開発環境では localhost）
const LOCALSTACK_ENDPOINT =
  process.env.AWS_ENDPOINT_URL || 'http://localhost:4566';

console.log('Integration test endpoint:', LOCALSTACK_ENDPOINT);

// LocalStack用のDynamoDBクライアント設定
const client = new DynamoDBClient({
  region: testEnv.AWS_REGION,
  endpoint: LOCALSTACK_ENDPOINT,
  credentials: {
    accessKeyId: testEnv.AWS_ACCESS_KEY_ID,
    secretAccessKey: testEnv.AWS_SECRET_ACCESS_KEY,
  },
});

const dynamodb = DynamoDBDocumentClient.from(client);

describe('DynamoDB Integration Tests', () => {
  const tableName = 'test-users';

  beforeAll(async () => {
    console.log('Setting up integration tests...');
    console.log('Endpoint:', LOCALSTACK_ENDPOINT);
    console.log('Table:', tableName);

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
      console.log('✅ Test table created successfully');

      // テーブル作成の待機
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error: any) {
      if (error.name === 'ResourceInUseException') {
        console.log('✅ Test table already exists');
      } else {
        console.error('❌ Failed to create test table:', error);
        throw error;
      }
    }
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
