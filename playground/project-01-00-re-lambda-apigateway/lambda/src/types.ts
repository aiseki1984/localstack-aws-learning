// 記事（Post）の型定義
export interface Post {
  id: string;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  status: 'draft' | 'published' | 'archived';
}

// 新規投稿用の型（IDや日付は自動生成）
export interface CreatePostRequest {
  title: string;
  content: string;
  author: string;
  tags?: string[];
  status?: 'draft' | 'published';
}

// 更新用の型（部分的な更新を許可）
export interface UpdatePostRequest {
  title?: string;
  content?: string;
  author?: string;
  tags?: string[];
  status?: 'draft' | 'published' | 'archived';
}

// API レスポンスの型定義
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 投稿一覧取得のクエリパラメータ
export interface GetPostsQuery {
  limit?: number;
  offset?: number;
  status?: 'draft' | 'published' | 'archived';
  author?: string;
  tag?: string;
}

// ページネーション情報
export interface PaginationInfo {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}

// 投稿一覧のレスポンス
export interface GetPostsResponse {
  posts: Post[];
  pagination: PaginationInfo;
}
