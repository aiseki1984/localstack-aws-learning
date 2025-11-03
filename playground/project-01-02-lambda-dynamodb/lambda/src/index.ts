import {
  Context,
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
} from '@aws-sdk/lib-dynamodb';

// DynamoDB client setup
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.LOCALSTACK_HOSTNAME && {
    endpoint: `http://${process.env.LOCALSTACK_HOSTNAME}:4566`,
  }),
});

const dynamodb = DynamoDBDocumentClient.from(client);

export interface UserItem {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export const putUser = async (
  user: Omit<UserItem, 'createdAt'>
): Promise<UserItem> => {
  const item: UserItem = {
    ...user,
    createdAt: new Date().toISOString(),
  };

  await dynamodb.send(
    new PutCommand({
      TableName: process.env.TABLE_NAME || 'users',
      Item: item,
    })
  );

  return item;
};

export const getUser = async (id: string): Promise<UserItem | null> => {
  const result = await dynamodb.send(
    new GetCommand({
      TableName: process.env.TABLE_NAME || 'users',
      Key: { id },
    })
  );

  return (result.Item as UserItem) || null;
};

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Event:', JSON.stringify(event, null, 2));

    const method = event.httpMethod;
    const pathParameters = event.pathParameters || {};

    switch (method) {
      case 'POST':
        const body = JSON.parse(event.body || '{}');
        const user = await putUser({
          id: body.id,
          name: body.name,
          email: body.email,
        });
        return {
          statusCode: 201,
          body: JSON.stringify(user),
        };

      case 'GET':
        const userId = pathParameters.id;
        if (!userId) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'User ID is required' }),
          };
        }
        const foundUser = await getUser(userId);
        if (!foundUser) {
          return {
            statusCode: 404,
            body: JSON.stringify({ error: 'User not found' }),
          };
        }
        return {
          statusCode: 200,
          body: JSON.stringify(foundUser),
        };

      default:
        return {
          statusCode: 405,
          body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
