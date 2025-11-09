import {
  Post,
  CreatePostRequest,
  UpdatePostRequest,
  GetPostsQuery,
  GetPostsResponse,
  PaginationInfo,
} from './types';
import {
  PutCommand,
  GetCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { createDynamoDBClient, getTableName } from './dynamodb-client';
import { randomUUID } from 'crypto';

export class PostsService {
  private dynamoClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor(
    dynamoClient?: DynamoDBDocumentClient,
    tableName?: string
  ) {
    this.dynamoClient = dynamoClient || createDynamoDBClient();
    this.tableName = tableName || getTableName();
  }

  async getPosts(query: GetPostsQuery): Promise<GetPostsResponse> {
    try {
      // DynamoDB Scanコマンドの構築
      const scanParams: any = {
        TableName: this.tableName,
      };

      // フィルター式の構築
      const filterExpressions: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      // ステータスでフィルタ
      if (query.status) {
        filterExpressions.push('#status = :status');
        expressionAttributeNames['#status'] = 'status';
        expressionAttributeValues[':status'] = query.status;
      }

      // 作成者でフィルタ（部分一致）
      if (query.author) {
        filterExpressions.push('contains(#author, :author)');
        expressionAttributeNames['#author'] = 'author';
        expressionAttributeValues[':author'] = query.author;
      }

      // タグでフィルタ（配列内の部分一致）
      if (query.tag) {
        filterExpressions.push('contains(#tags, :tag)');
        expressionAttributeNames['#tags'] = 'tags';
        expressionAttributeValues[':tag'] = query.tag;
      }

      // フィルター式を適用
      if (filterExpressions.length > 0) {
        scanParams.FilterExpression = filterExpressions.join(' AND ');
        scanParams.ExpressionAttributeNames = expressionAttributeNames;
        scanParams.ExpressionAttributeValues = expressionAttributeValues;
      }

      // DynamoDB Scan実行
      const result = await this.dynamoClient.send(new ScanCommand(scanParams));
      let posts = (result.Items || []) as Post[];

      // 作成日時でソート（新しいものから）
      posts.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // ページネーション（メモリ上で実施）
      const limit = query.limit || 10;
      const offset = query.offset || 0;
      const total = posts.length;

      const paginatedPosts = posts.slice(offset, offset + limit);

      const pagination: PaginationInfo = {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      };

      return {
        posts: paginatedPosts,
        pagination,
      };
    } catch (error) {
      console.error('Error getting posts from DynamoDB:', error);
      throw error;
    }
  }

  async getPostById(id: string): Promise<Post | null> {
    try {
      const result = await this.dynamoClient.send(
        new GetCommand({
          TableName: this.tableName,
          Key: { id },
        })
      );

      return (result.Item as Post) || null;
    } catch (error) {
      console.error('Error getting post by ID from DynamoDB:', error);
      throw error;
    }
  }

  async createPost(createRequest: CreatePostRequest): Promise<Post> {
    try {
      const now = new Date().toISOString();

      const newPost: Post = {
        id: randomUUID(), // UUIDを使用
        title: createRequest.title,
        content: createRequest.content,
        author: createRequest.author,
        createdAt: now,
        updatedAt: now,
        tags: createRequest.tags || [],
        status: createRequest.status || 'draft',
      };

      // DynamoDBに保存
      await this.dynamoClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: newPost,
        })
      );

      return newPost;
    } catch (error) {
      console.error('Error creating post in DynamoDB:', error);
      throw error;
    }
  }

  async updatePost(
    id: string,
    updateRequest: UpdatePostRequest
  ): Promise<Post | null> {
    try {
      // まず既存のポストを取得
      const existingPost = await this.getPostById(id);
      if (!existingPost) {
        return null;
      }

      const now = new Date().toISOString();

      // 更新式の構築
      const updateExpressions: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      // updatedAtは必ず更新
      updateExpressions.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = now;

      // 各フィールドを動的に追加
      if (updateRequest.title !== undefined) {
        updateExpressions.push('#title = :title');
        expressionAttributeNames['#title'] = 'title';
        expressionAttributeValues[':title'] = updateRequest.title;
      }

      if (updateRequest.content !== undefined) {
        updateExpressions.push('#content = :content');
        expressionAttributeNames['#content'] = 'content';
        expressionAttributeValues[':content'] = updateRequest.content;
      }

      if (updateRequest.author !== undefined) {
        updateExpressions.push('#author = :author');
        expressionAttributeNames['#author'] = 'author';
        expressionAttributeValues[':author'] = updateRequest.author;
      }

      if (updateRequest.tags !== undefined) {
        updateExpressions.push('#tags = :tags');
        expressionAttributeNames['#tags'] = 'tags';
        expressionAttributeValues[':tags'] = updateRequest.tags;
      }

      if (updateRequest.status !== undefined) {
        updateExpressions.push('#status = :status');
        expressionAttributeNames['#status'] = 'status';
        expressionAttributeValues[':status'] = updateRequest.status;
      }

      // DynamoDBの更新
      const result = await this.dynamoClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { id },
          UpdateExpression: `SET ${updateExpressions.join(', ')}`,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
          ReturnValues: 'ALL_NEW',
        })
      );

      return (result.Attributes as Post) || null;
    } catch (error) {
      console.error('Error updating post in DynamoDB:', error);
      throw error;
    }
  }

  async deletePost(id: string): Promise<boolean> {
    try {
      // まず存在確認
      const existingPost = await this.getPostById(id);
      if (!existingPost) {
        return false;
      }

      // DynamoDBから削除
      await this.dynamoClient.send(
        new DeleteCommand({
          TableName: this.tableName,
          Key: { id },
        })
      );

      return true;
    } catch (error) {
      console.error('Error deleting post from DynamoDB:', error);
      throw error;
    }
  }

  // テスト用メソッド: データをリセット（テストデータを挿入）
  async resetData(): Promise<void> {
    try {
      // 既存のすべてのデータを取得
      const result = await this.dynamoClient.send(
        new ScanCommand({
          TableName: this.tableName,
        })
      );

      // すべてのアイテムを削除
      if (result.Items && result.Items.length > 0) {
        for (const item of result.Items) {
          await this.dynamoClient.send(
            new DeleteCommand({
              TableName: this.tableName,
              Key: { id: item.id },
            })
          );
        }
      }

      // テストデータを挿入
      const testPost: Post = {
        id: '1',
        title: 'Introduction to AWS Lambda',
        content: 'AWS Lambda is a serverless computing service...',
        author: 'John Doe',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
        tags: ['aws', 'lambda', 'serverless'],
        status: 'published',
      };

      await this.dynamoClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: testPost,
        })
      );
    } catch (error) {
      console.error('Error resetting data in DynamoDB:', error);
      throw error;
    }
  }

  // テスト用メソッド: 全データを取得
  async getAllPosts(): Promise<Post[]> {
    try {
      const result = await this.dynamoClient.send(
        new ScanCommand({
          TableName: this.tableName,
        })
      );

      return (result.Items || []) as Post[];
    } catch (error) {
      console.error('Error getting all posts from DynamoDB:', error);
      throw error;
    }
  }
}
