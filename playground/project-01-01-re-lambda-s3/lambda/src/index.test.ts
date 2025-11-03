import { describe, it, expect, beforeAll } from 'vitest';
import { uploadTextFile, getTextFile, listFiles, deleteFile } from '../src/index';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';

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

  describe('uploadTextFile', () => {
    it('should upload a text file successfully', async () => {
      const event = createMockEvent(JSON.stringify({
        fileName: 'test.txt',
        content: 'Hello, World!'
      }));

      const result = await uploadTextFile(event, mockContext);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('File uploaded successfully');
      expect(body.fileName).toBe('test.txt');
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
      const event = createMockEvent();
      
      const result = await listFiles(event, mockContext);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.bucket).toBeDefined();
      expect(Array.isArray(body.files)).toBe(true);
      expect(typeof body.count).toBe('number');
    });
  });

  describe('getTextFile', () => {
    it('should return 400 for missing fileName', async () => {
      const event = createMockEvent(undefined, {});
      
      const result = await getTextFile(event, mockContext);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('fileName is required');
    });
  });

  describe('deleteFile', () => {
    it('should return 400 for missing fileName', async () => {
      const event = createMockEvent(undefined, {});
      
      const result = await deleteFile(event, mockContext);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('fileName is required');
    });
  });
});