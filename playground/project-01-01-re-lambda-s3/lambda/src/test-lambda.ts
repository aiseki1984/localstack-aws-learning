#!/usr/bin/env node

/**
 * Lambda関数のテスト実行用スクリプト
 * LocalStackが動いている環境でテストできます
 */

import { uploadTextFile, getTextFile, listFiles, deleteFile } from './index';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';

// モックイベントとコンテキストを作成
const createTestEvent = (body?: string, pathParameters?: { [key: string]: string }): APIGatewayProxyEvent => ({
  body: body || null,
  pathParameters: pathParameters || null,
  httpMethod: 'POST',
  headers: {},
  multiValueHeaders: {},
  isBase64Encoded: false,
  path: '/test',
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  stageVariables: null,
  requestContext: {
    accountId: 'test',
    apiId: 'test',
    protocol: 'HTTP/1.1',
    httpMethod: 'POST',
    path: '/test',
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
    resourcePath: '/test'
  },
  resource: '/test'
});

const mockContext: Context = {
  callbackWaitsForEmptyEventLoop: false,
  functionName: 'test-function',
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
};

async function testLambdaFunctions() {
  console.log('🚀 Lambda関数のテストを開始します...\n');

  try {
    // 1. テキストファイルをアップロード
    console.log('📁 1. テキストファイルのアップロードをテスト');
    const uploadEvent = createTestEvent(JSON.stringify({
      fileName: 'hello.txt',
      content: 'Hello from Lambda! 今日は良い天気ですね。'
    }));

    const uploadResult = await uploadTextFile(uploadEvent, mockContext);
    console.log('アップロード結果:', JSON.parse(uploadResult.body));
    console.log('ステータス:', uploadResult.statusCode, '\n');

    // 2. ファイル一覧を取得
    console.log('📋 2. ファイル一覧の取得をテスト');
    const listEvent = createTestEvent();
    const listResult = await listFiles(listEvent, mockContext);
    console.log('ファイル一覧:', JSON.parse(listResult.body));
    console.log('ステータス:', listResult.statusCode, '\n');

    // 3. ファイルの内容を取得
    console.log('📖 3. ファイル内容の取得をテスト');
    const getEvent = createTestEvent(undefined, { fileName: 'hello.txt' });
    const getResult = await getTextFile(getEvent, mockContext);
    console.log('ファイル内容:', JSON.parse(getResult.body));
    console.log('ステータス:', getResult.statusCode, '\n');

    // 4. 別のファイルをアップロード
    console.log('📁 4. 別のテキストファイルのアップロードをテスト');
    const upload2Event = createTestEvent(JSON.stringify({
      fileName: 'readme.txt',
      content: 'このファイルはLambdaからアップロードされました。\n日本語テストも含んでいます。'
    }));

    const upload2Result = await uploadTextFile(upload2Event, mockContext);
    console.log('アップロード結果:', JSON.parse(upload2Result.body));
    console.log('ステータス:', upload2Result.statusCode, '\n');

    // 5. 更新されたファイル一覧を取得
    console.log('📋 5. 更新されたファイル一覧の取得をテスト');
    const list2Result = await listFiles(listEvent, mockContext);
    console.log('ファイル一覧:', JSON.parse(list2Result.body));
    console.log('ステータス:', list2Result.statusCode, '\n');

    // 6. ファイルの削除テスト
    console.log('🗑️ 6. ファイルの削除をテスト');
    const deleteEvent = createTestEvent(undefined, { fileName: 'hello.txt' });
    const deleteResult = await deleteFile(deleteEvent, mockContext);
    console.log('削除結果:', JSON.parse(deleteResult.body));
    console.log('ステータス:', deleteResult.statusCode, '\n');

    // 7. 削除後のファイル一覧を確認
    console.log('📋 7. 削除後のファイル一覧の確認');
    const list3Result = await listFiles(listEvent, mockContext);
    console.log('ファイル一覧:', JSON.parse(list3Result.body));
    console.log('ステータス:', list3Result.statusCode, '\n');

    console.log('✅ すべてのテストが完了しました！');

  } catch (error) {
    console.error('❌ テスト中にエラーが発生しました:', error);
  }
}

// エラーハンドリング用のテストも実行
async function testErrorCases() {
  console.log('\n🔍 エラーケースのテストを開始します...\n');

  try {
    // 存在しないファイルを取得
    console.log('📖 存在しないファイルの取得テスト');
    const getEvent = createTestEvent(undefined, { fileName: 'nonexistent.txt' });
    const getResult = await getTextFile(getEvent, mockContext);
    console.log('結果:', JSON.parse(getResult.body));
    console.log('ステータス:', getResult.statusCode, '\n');

    // 不正なリクエスト（ファイル名なし）
    console.log('📁 不正なアップロードリクエストのテスト');
    const badUploadEvent = createTestEvent(JSON.stringify({
      content: 'ファイル名がありません'
    }));
    const badUploadResult = await uploadTextFile(badUploadEvent, mockContext);
    console.log('結果:', JSON.parse(badUploadResult.body));
    console.log('ステータス:', badUploadResult.statusCode, '\n');

    console.log('✅ エラーケースのテストも完了しました！');

  } catch (error) {
    console.error('❌ エラーケーステスト中にエラーが発生しました:', error);
  }
}

// メイン実行
async function main() {
  await testLambdaFunctions();
  await testErrorCases();
}

// スクリプトとして実行された場合のみ実行
if (require.main === module) {
  main().catch(console.error);
}

export { testLambdaFunctions, testErrorCases };