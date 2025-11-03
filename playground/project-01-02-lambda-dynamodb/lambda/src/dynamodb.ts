import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// DynamoDB client setup
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.LOCALSTACK_HOSTNAME && {
    endpoint: `http://${process.env.LOCALSTACK_HOSTNAME}:4566`,
  }),
});

export const dynamodb = DynamoDBDocumentClient.from(client);
