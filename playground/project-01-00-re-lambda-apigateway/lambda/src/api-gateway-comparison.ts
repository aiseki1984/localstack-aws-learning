// API Gateway v1 (REST API) vs v2 (HTTP API) の違い

// ===================================
// 1. イベントオブジェクトの違い
// ===================================

// v1 (REST API) - 現在使用中
interface APIGatewayProxyEvent {
  httpMethod: string;           // "GET", "POST" など
  path: string;                 // "/posts"
  pathParameters: { [key: string]: string } | null;
  queryStringParameters: { [key: string]: string } | null;
  headers: { [key: string]: string };
  body: string | null;
  requestContext: {
    requestId: string;
    stage: string;
    // ... その他多数のプロパティ
  };
}

// v2 (HTTP API) - 新しい形式
interface APIGatewayProxyEventV2 {
  version: "2.0";
  routeKey: string;             // "GET /posts"
  rawPath: string;              // "/posts"
  pathParameters?: { [key: string]: string };
  queryStringParameters?: { [key: string]: string };
  headers: { [key: string]: string };
  body?: string;
  requestContext: {
    requestId: string;
    stage: string;
    http: {
      method: string;             // "GET", "POST" など
      path: string;
      protocol: string;
      sourceIp: string;
      userAgent: string;
    };
    // ... 構造が異なる
  };
}

// ===================================
// 2. TypeScript型定義の変更
// ===================================

// v1用のインポート（現在）
import {
  Context,
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from 'aws-lambda';

// v2用のインポート（変更後）
import {
  Context,
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';

// ===================================
// 3. ハンドラー関数の変更例
// ===================================

// v1 (現在のコード)
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const method = event.httpMethod;
  const path = event.path;
  // ...
};

// v2 (変更後)
export const handler = async (
  event: APIGatewayProxyEventV2,
  context: Context
): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method;
  const path = event.rawPath;
  // ...
};