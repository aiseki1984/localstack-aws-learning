import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler } from './index';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';

// テスト用のヘルパー関数
const createMockEvent = (
  httpMethod: string,
  path: string,
  body?: string,
  pathParameters?: Record<string, string>,
  queryStringParameters?: Record<string, string>
): APIGatewayProxyEvent => ({
  httpMethod,
  path,
  body: body || null,
  pathParameters: pathParameters || null,
  queryStringParameters: queryStringParameters || null,
  headers: {},
  multiValueHeaders: {},
  isBase64Encoded: false,
  resource: '',
  requestContext: {} as any,
  stageVariables: null,
  multiValueQueryStringParameters: null,
});

const createMockContext = (): Context => ({
  functionName: 'test-function',
  functionVersion: '1',
  invokedFunctionArn:
    'arn:aws:lambda:us-east-1:123456789012:function:test-function',
  memoryLimitInMB: '128',
  awsRequestId: 'test-request-id',
  logGroupName: '/aws/lambda/test-function',
  logStreamName: '2024/01/01/[$LATEST]test-stream',
  getRemainingTimeInMillis: () => 30000,
  done: vi.fn(),
  fail: vi.fn(),
  succeed: vi.fn(),
  callbackWaitsForEmptyEventLoop: true,
});

describe('Posts API Lambda Handler', () => {
  let mockContext: Context;

  beforeEach(() => {
    mockContext = createMockContext();
    vi.clearAllMocks();
  });

  describe('GET /posts', () => {
    it('should return list of posts', async () => {
      const event = createMockEvent('GET', '/posts');

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.posts).toBeInstanceOf(Array);
      expect(body.data.pagination).toBeDefined();
    });

    it('should filter posts by status', async () => {
      const event = createMockEvent('GET', '/posts', undefined, undefined, {
        status: 'published',
      });

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      body.data.posts.forEach((post: any) => {
        expect(post.status).toBe('published');
      });
    });

    it('should support pagination', async () => {
      const event = createMockEvent('GET', '/posts', undefined, undefined, {
        limit: '1',
        offset: '0',
      });

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.data.posts).toHaveLength(1);
      expect(body.data.pagination.limit).toBe(1);
      expect(body.data.pagination.offset).toBe(0);
    });
  });

  describe('GET /posts/{id}', () => {
    it('should return a specific post', async () => {
      const event = createMockEvent('GET', '/posts/1', undefined, { id: '1' });

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe('1');
      expect(body.data.title).toBeDefined();
    });

    it('should return 404 for non-existent post', async () => {
      const event = createMockEvent('GET', '/posts/999', undefined, {
        id: '999',
      });

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(404);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.message).toBe('Post not found');
    });
  });

  describe('POST /posts', () => {
    it('should create a new post', async () => {
      const newPost = {
        title: 'Test Post',
        content: 'This is a test post content',
        author: 'Test Author',
        tags: ['test'],
        status: 'draft',
      };

      const event = createMockEvent('POST', '/posts', JSON.stringify(newPost));

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.title).toBe(newPost.title);
      expect(body.data.id).toBeDefined();
      expect(body.data.createdAt).toBeDefined();
      expect(body.message).toBe('Post created successfully');
    });

    it('should return 400 for missing required fields', async () => {
      const invalidPost = {
        title: 'Test Post',
        // missing content and author
      };

      const event = createMockEvent(
        'POST',
        '/posts',
        JSON.stringify(invalidPost)
      );

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.message).toBe('Title, content, and author are required');
    });

    it('should return 400 for empty body', async () => {
      const event = createMockEvent('POST', '/posts');

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.message).toBe('Request body is required');
    });
  });

  describe('PUT /posts/{id}', () => {
    it('should update an existing post', async () => {
      const updateData = {
        title: 'Updated Title',
        content: 'Updated content',
      };

      const event = createMockEvent(
        'PUT',
        '/posts/1',
        JSON.stringify(updateData),
        { id: '1' }
      );

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.title).toBe(updateData.title);
      expect(body.data.content).toBe(updateData.content);
      expect(body.message).toBe('Post updated successfully');
    });

    it('should return 404 for non-existent post', async () => {
      const updateData = { title: 'Updated Title' };

      const event = createMockEvent(
        'PUT',
        '/posts/999',
        JSON.stringify(updateData),
        { id: '999' }
      );

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(404);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.message).toBe('Post not found');
    });
  });

  describe('DELETE /posts/{id}', () => {
    it('should delete an existing post', async () => {
      const event = createMockEvent('DELETE', '/posts/1', undefined, {
        id: '1',
      });

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe('1');
      expect(body.message).toBe('Post deleted successfully');
    });

    it('should return 404 for non-existent post', async () => {
      const event = createMockEvent('DELETE', '/posts/999', undefined, {
        id: '999',
      });

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(404);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.message).toBe('Post not found');
    });
  });

  describe('CORS and Error Handling', () => {
    it('should handle OPTIONS requests for CORS', async () => {
      const event = createMockEvent('OPTIONS', '/posts');

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(200);
      expect(response.headers?.['Access-Control-Allow-Origin']).toBe('*');
      expect(response.headers?.['Access-Control-Allow-Methods']).toBeDefined();
    });

    it('should return 405 for unsupported methods', async () => {
      const event = createMockEvent('PATCH', '/posts');

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(405);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.message).toBe('Method not allowed');
    });

    it('should return 404 for unknown endpoints', async () => {
      const event = createMockEvent('GET', '/unknown');

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(404);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.message).toBe('Endpoint not found');
    });
  });
});
