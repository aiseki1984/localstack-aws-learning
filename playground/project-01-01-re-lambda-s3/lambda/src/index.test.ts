import { describe, it, expect, beforeEach, vi } from 'vitest';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';

// モック化されたS3Clientの作成
const mockSend = vi.fn();
const mockS3Client = {
  send: mockSend
};

// AWS SDKのモック化
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => mockS3Client),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
  ListObjectsV2Command: vi.fn(),
  DeleteObjectCommand: vi.fn()
}));

// s3-configのモック化
vi.mock('./s3-config', () => ({
  s3Client: mockS3Client,
  BUCKET_NAME: 'test-bucket',
  createS3Key: (fileName: string) => `uploads/${fileName}`,
  extractFileName: (s3Key: string) => s3Key.replace('uploads/', ''),
  createSuccessHeaders: () => ({ 'Content-Type': 'application/json' })
}));

// テスト対象の関数をインポート（モックの後にインポート）
const { uploadTextFile, getTextFile, listFiles, deleteFile } = await import('./s3-operations');
const { handler } = await import('./index');

// モックイベントを作成するヘルパー関数
const createMockEvent = (body?: string, pathParameters?: { [key: string]: string }): APIGatewayProxyEvent => ({
  body: body || null,
  pathParameters: pathParameters || null,
  httpMethod: 'POST',
  headers: {},
  multiValueHeaders: {},
  isBase64Encoded: false,
  path: '/upload',
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  stageVariables: null,
  requestContext: {
    accountId: 'test',
    apiId: 'test',
    protocol: 'HTTP/1.1',
    httpMethod: 'POST',
    path: '/upload',
    stage: 'test',
    requestId: 'test',
    requestTime: '01/Jan/2023:00:00:00 +0000',
    requestTimeEpoch: 1672531200000,
    identity: {
      cognitoIdentityPoolId: null,
      accountId: null,
      cognitoIdentityId: null,
      caller: null,
      sourceIp: '127.0.0.1',
      principalOrgId: null,
      accessKey: null,
      cognitoAuthenticationType: null,
      cognitoAuthenticationProvider: null,
      userArn: null,
      userAgent: 'test',
      user: null,
      apiKey: null,
      apiKeyId: null,
      clientCert: null,
      vpcId: null,
      vpceId: null
    },
    authorizer: null,
    domainName: 'localhost',
    resourceId: 'test',
    resourcePath: '/upload'
  },
  resource: '/upload'
});

const createMockContext = (): Context => ({
  callbackWaitsForEmptyEventLoop: false,
  functionName: 'test',
  functionVersion: '1',
  invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test',
  memoryLimitInMB: '128',
  awsRequestId: 'test-request-id',
  logGroupName: '/aws/lambda/test',
  logStreamName: '2023/01/01/[$LATEST]test',
  getRemainingTimeInMillis: () => 300000,
  done: () => {},
  fail: () => {},
  succeed: () => {}
});

describe('S3 Lambda Functions', () => {
  const mockContext = createMockContext();
  
  // 各テスト前にモックをリセット
  beforeEach(() => {
    mockSend.mockReset();
  });

  describe('uploadTextFile', () => {
    it('should upload a text file successfully', async () => {
      // S3の正常なレスポンスをモック
      mockSend.mockResolvedValueOnce({
        $metadata: { httpStatusCode: 200 }
      });

      const event = createMockEvent(JSON.stringify({
        fileName: 'test.txt',
        content: 'Hello, World!'
      }));

      const result = await uploadTextFile(event, mockContext);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('File uploaded successfully');
      expect(body.fileName).toBe('test.txt');
      expect(body.bucket).toBe('test-bucket');
      expect(body.key).toBe('uploads/test.txt');
    });

    it('should return 400 for missing fileName', async () => {
      const event = createMockEvent(JSON.stringify({
        content: 'Hello, World!'
      }));

      const result = await uploadTextFile(event, mockContext);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('fileName and content are required');
    });

    it('should return 400 for missing content', async () => {
      const event = createMockEvent(JSON.stringify({
        fileName: 'test.txt'
      }));

      const result = await uploadTextFile(event, mockContext);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('fileName and content are required');
    });
  });

  describe('listFiles', () => {
    it('should list files successfully', async () => {
      // S3のListObjectsV2レスポンスをモック
      mockSend.mockResolvedValueOnce({
        Contents: [
          {
            Key: 'uploads/test1.txt',
            Size: 100,
            LastModified: new Date('2023-01-01')
          },
          {
            Key: 'uploads/test2.txt', 
            Size: 200,
            LastModified: new Date('2023-01-02')
          }
        ]
      });

      const event = createMockEvent();
      
      const result = await listFiles(event, mockContext);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.bucket).toBe('test-bucket');
      expect(Array.isArray(body.files)).toBe(true);
      expect(body.files).toHaveLength(2);
      expect(body.count).toBe(2);
      expect(body.files[0].fileName).toBe('test1.txt');
    });
  });

  describe('getTextFile', () => {
    it('should get a text file successfully', async () => {
      // S3のGetObjectレスポンスをモック
      mockSend.mockResolvedValueOnce({
        Body: {
          transformToString: () => Promise.resolve('Hello, World!')
        },
        ContentType: 'text/plain',
        LastModified: new Date('2023-01-01'),
        Metadata: {
          uploadedat: '2023-01-01T00:00:00.000Z',
          uploadedby: 'lambda-function'
        }
      });

      const event = createMockEvent(undefined, { fileName: 'test.txt' });
      
      const result = await getTextFile(event, mockContext);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.fileName).toBe('test.txt');
      expect(body.content).toBe('Hello, World!');
      expect(body.contentType).toBe('text/plain');
    });

    it('should return 400 for missing fileName', async () => {
      const event = createMockEvent(undefined, {});
      
      const result = await getTextFile(event, mockContext);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('fileName is required');
    });

    it('should return 404 for file not found', async () => {
      // S3のNoSuchKeyエラーをモック
      const error = new Error('NoSuchKey');
      error.name = 'NoSuchKey';
      mockSend.mockRejectedValueOnce(error);

      const event = createMockEvent(undefined, { fileName: 'nonexistent.txt' });
      
      const result = await getTextFile(event, mockContext);
      
      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('File not found');
    });
  });

  describe('deleteFile', () => {
    it('should delete a file successfully', async () => {
      // S3のDeleteObjectレスポンスをモック
      mockSend.mockResolvedValueOnce({
        $metadata: { httpStatusCode: 204 }
      });

      const event = createMockEvent(undefined, { fileName: 'test.txt' });
      
      const result = await deleteFile(event, mockContext);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('File deleted successfully');
      expect(body.fileName).toBe('test.txt');
      expect(body.key).toBe('uploads/test.txt');
    });

    it('should return 400 for missing fileName', async () => {
      const event = createMockEvent(undefined, {});
      
      const result = await deleteFile(event, mockContext);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('fileName is required');
    });
  });

  describe('handler (Integrated Router)', () => {
    it('should route POST to uploadTextFile', async () => {
      mockSend.mockResolvedValueOnce({
        $metadata: { httpStatusCode: 200 }
      });

      const event = createMockEvent(JSON.stringify({
        fileName: 'router-test.txt',
        content: 'Router test content'
      }));
      event.httpMethod = 'POST';

      const result = await handler(event, mockContext);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('File uploaded successfully');
      expect(body.fileName).toBe('router-test.txt');
    });

    it('should route GET to listFiles when no fileName', async () => {
      mockSend.mockResolvedValueOnce({
        Contents: []
      });

      const event = createMockEvent();
      event.httpMethod = 'GET';

      const result = await handler(event, mockContext);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.bucket).toBe('test-bucket');
      expect(Array.isArray(body.files)).toBe(true);
    });

    it('should route GET with fileName to getTextFile', async () => {
      mockSend.mockResolvedValueOnce({
        Body: {
          transformToString: () => Promise.resolve('File content')
        },
        ContentType: 'text/plain',
        LastModified: new Date('2023-01-01'),
        Metadata: {}
      });

      const event = createMockEvent(undefined, { fileName: 'test.txt' });
      event.httpMethod = 'GET';

      const result = await handler(event, mockContext);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.fileName).toBe('test.txt');
      expect(body.content).toBe('File content');
    });

    it('should route PUT to uploadTextFile', async () => {
      mockSend.mockResolvedValueOnce({
        $metadata: { httpStatusCode: 200 }
      });

      const event = createMockEvent(JSON.stringify({
        fileName: 'update-test.txt',
        content: 'Updated content'
      }));
      event.httpMethod = 'PUT';

      const result = await handler(event, mockContext);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('File uploaded successfully');
      expect(body.fileName).toBe('update-test.txt');
    });

    it('should route DELETE to deleteFile', async () => {
      mockSend.mockResolvedValueOnce({
        $metadata: { httpStatusCode: 204 }
      });

      const event = createMockEvent(undefined, { fileName: 'delete-test.txt' });
      event.httpMethod = 'DELETE';

      const result = await handler(event, mockContext);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('File deleted successfully');
      expect(body.fileName).toBe('delete-test.txt');
    });

    it('should return 405 for unsupported method', async () => {
      const event = createMockEvent();
      event.httpMethod = 'PATCH';

      const result = await handler(event, mockContext);
      
      expect(result.statusCode).toBe(405);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Method not allowed');
      expect(body.allowedMethods).toContain('GET');
      expect(body.allowedMethods).toContain('POST');
      expect(body.allowedMethods).toContain('PUT');
      expect(body.allowedMethods).toContain('DELETE');
    });
  });
});