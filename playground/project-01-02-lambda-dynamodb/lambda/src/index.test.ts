import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler, putUser, getUser, UserItem } from './index';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';

// AWS SDK をモック
vi.mock('@aws-sdk/client-dynamodb');
vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn(() => ({
      send: vi.fn(),
    })),
  },
  PutCommand: vi.fn(),
  GetCommand: vi.fn(),
}));

describe('Lambda Handler', () => {
  let mockEvent: Partial<APIGatewayProxyEvent>;
  let mockContext: Partial<Context>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = {
      functionName: 'test-function',
      functionVersion: '1',
      invokedFunctionArn:
        'arn:aws:lambda:us-east-1:123456789012:function:test-function',
      memoryLimitInMB: '128',
      awsRequestId: 'test-request-id',
      logGroupName: '/aws/lambda/test-function',
      logStreamName: '2023/01/01/[$LATEST]test-stream',
      getRemainingTimeInMillis: () => 30000,
      done: vi.fn(),
      fail: vi.fn(),
      succeed: vi.fn(),
      callbackWaitsForEmptyEventLoop: true,
    };
  });

  describe('POST /users', () => {
    beforeEach(() => {
      mockEvent = {
        httpMethod: 'POST',
        body: JSON.stringify({
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
        }),
        pathParameters: null,
      };
    });

    it('should create a new user', async () => {
      const response = await handler(
        mockEvent as APIGatewayProxyEvent,
        mockContext as Context
      );

      expect(response.statusCode).toBe(201);

      const responseBody = JSON.parse(response.body);
      expect(responseBody).toMatchObject({
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
      });
      expect(responseBody.createdAt).toBeTruthy();
    });
  });

  describe('GET /users/{id}', () => {
    beforeEach(() => {
      mockEvent = {
        httpMethod: 'GET',
        pathParameters: { id: 'user-123' },
        body: null,
      };
    });

    it('should return 400 when user ID is missing', async () => {
      mockEvent.pathParameters = null;

      const response = await handler(
        mockEvent as APIGatewayProxyEvent,
        mockContext as Context
      );

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body)).toEqual({
        error: 'User ID is required',
      });
    });
  });

  describe('Invalid method', () => {
    beforeEach(() => {
      mockEvent = {
        httpMethod: 'DELETE',
        pathParameters: null,
        body: null,
      };
    });

    it('should return 405 for unsupported methods', async () => {
      const response = await handler(
        mockEvent as APIGatewayProxyEvent,
        mockContext as Context
      );

      expect(response.statusCode).toBe(405);
      expect(JSON.parse(response.body)).toEqual({
        error: 'Method not allowed',
      });
    });
  });
});

describe('User Functions', () => {
  const mockUser = {
    id: 'user-123',
    name: 'John Doe',
    email: 'john@example.com',
  };

  describe('putUser', () => {
    it('should add createdAt timestamp', async () => {
      // この部分は実際のDynamoDBモックが必要ですが、
      // ここではロジックのテストに焦点を当てます
      const result = await putUser(mockUser);

      expect(result).toMatchObject(mockUser);
      expect(result.createdAt).toBeTruthy();
      expect(new Date(result.createdAt)).toBeInstanceOf(Date);
    });
  });
});
