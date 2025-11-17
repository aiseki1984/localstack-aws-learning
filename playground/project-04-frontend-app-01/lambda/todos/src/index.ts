import {
  Context,
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from 'aws-lambda';
import {
  Post,
  CreatePostRequest,
  UpdatePostRequest,
  ApiResponse,
  GetPostsQuery,
  GetPostsResponse,
} from './types';
import { PostsService } from './posts-service';

// CORS ヘッダー
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// レスポンス作成のヘルパー関数
const createResponse = (
  statusCode: number,
  body: ApiResponse | any,
  additionalHeaders: Record<string, string> = {}
): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    ...corsHeaders,
    ...additionalHeaders,
  },
  body: JSON.stringify(body),
});

// エラーレスポンス作成
const createErrorResponse = (
  statusCode: number,
  message: string,
  error?: string
): APIGatewayProxyResult =>
  createResponse(statusCode, {
    success: false,
    message,
    error,
  });

// 成功レスポンス作成
const createSuccessResponse = (
  statusCode: number,
  data: any,
  message?: string
): APIGatewayProxyResult =>
  createResponse(statusCode, {
    success: true,
    data,
    message,
  });

// クエリパラメータのパース
const parseQueryParameters = (event: APIGatewayProxyEvent): GetPostsQuery => {
  const queryStringParameters = event.queryStringParameters || {};

  return {
    limit: queryStringParameters.limit
      ? parseInt(queryStringParameters.limit, 10)
      : undefined,
    offset: queryStringParameters.offset
      ? parseInt(queryStringParameters.offset, 10)
      : undefined,
    status: queryStringParameters.status as
      | 'draft'
      | 'published'
      | 'archived'
      | undefined,
    author: queryStringParameters.author,
    tag: queryStringParameters.tag,
  };
};

// Posts service instance (テスト用に外部から注入可能にする)
let postsServiceInstance: PostsService | null = null;

const getPostsService = (): PostsService => {
  if (!postsServiceInstance) {
    postsServiceInstance = new PostsService();
  }
  return postsServiceInstance;
};

// テスト用: PostsServiceインスタンスを設定
export const setPostsService = (service: PostsService): void => {
  postsServiceInstance = service;
};

// テスト用: PostsServiceインスタンスをリセット
export const resetPostsService = (): void => {
  postsServiceInstance = null;
};

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Event:', JSON.stringify(event, null, 2));

    const postsService = getPostsService();
    const method = event.httpMethod;
    const path = event.path;
    const pathParameters = event.pathParameters || {};

    // CORS preflight handling
    if (method === 'OPTIONS') {
      return createResponse(200, { message: 'CORS preflight' });
    }

    // ルーティング
    switch (method) {
      case 'GET':
        if (path === '/posts') {
          // GET /posts - 投稿一覧取得
          const query = parseQueryParameters(event);
          const result = await postsService.getPosts(query);
          return createSuccessResponse(200, result);
        } else if (pathParameters.id) {
          // GET /posts/{id} - 特定投稿の取得
          const post = await postsService.getPostById(pathParameters.id);
          if (!post) {
            return createErrorResponse(404, 'Post not found');
          }
          return createSuccessResponse(200, post);
        }
        break;

      case 'POST':
        if (path === '/posts') {
          // POST /posts - 新規投稿作成
          if (!event.body) {
            return createErrorResponse(400, 'Request body is required');
          }

          const createRequest: CreatePostRequest = JSON.parse(event.body);

          // 簡単なバリデーション
          if (
            !createRequest.title ||
            !createRequest.content ||
            !createRequest.author
          ) {
            return createErrorResponse(
              400,
              'Title, content, and author are required'
            );
          }

          const newPost = await postsService.createPost(createRequest);
          return createSuccessResponse(
            201,
            newPost,
            'Post created successfully'
          );
        }
        break;

      case 'PUT':
        if (pathParameters.id) {
          // PUT /posts/{id} - 投稿更新
          if (!event.body) {
            return createErrorResponse(400, 'Request body is required');
          }

          const updateRequest: UpdatePostRequest = JSON.parse(event.body);
          const updatedPost = await postsService.updatePost(
            pathParameters.id,
            updateRequest
          );

          if (!updatedPost) {
            return createErrorResponse(404, 'Post not found');
          }

          return createSuccessResponse(
            200,
            updatedPost,
            'Post updated successfully'
          );
        }
        break;

      case 'DELETE':
        if (pathParameters.id) {
          // DELETE /posts/{id} - 投稿削除
          const deleted = await postsService.deletePost(pathParameters.id);

          if (!deleted) {
            return createErrorResponse(404, 'Post not found');
          }

          return createSuccessResponse(
            200,
            { id: pathParameters.id },
            'Post deleted successfully'
          );
        }
        break;

      default:
        return createErrorResponse(405, 'Method not allowed');
    }

    return createErrorResponse(404, 'Endpoint not found');
  } catch (error) {
    console.error('Error:', error);
    return createErrorResponse(
      500,
      'Internal server error',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};
