import {
  Post,
  CreatePostRequest,
  UpdatePostRequest,
  GetPostsQuery,
  GetPostsResponse,
  PaginationInfo,
} from './types';

export class PostsService {
  private posts: Post[] = [
    {
      id: '1',
      title: 'Introduction to AWS Lambda',
      content:
        'AWS Lambda is a serverless computing service that lets you run code without provisioning or managing servers...',
      author: 'John Doe',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
      tags: ['aws', 'lambda', 'serverless'],
      status: 'published',
    },
    {
      id: '2',
      title: 'TypeScript Best Practices',
      content:
        'Here are some TypeScript best practices that will help you write better code...',
      author: 'Jane Smith',
      createdAt: '2024-01-16T14:30:00Z',
      updatedAt: '2024-01-16T14:30:00Z',
      tags: ['typescript', 'javascript', 'programming'],
      status: 'published',
    },
    {
      id: '3',
      title: 'Draft Post About API Gateway',
      content: 'This is a draft post about API Gateway integration patterns...',
      author: 'Bob Wilson',
      createdAt: '2024-01-17T09:00:00Z',
      updatedAt: '2024-01-17T09:00:00Z',
      tags: ['api-gateway', 'aws'],
      status: 'draft',
    },
  ];

  // ID生成用のカウンター
  private idCounter = 4;

  async getPosts(query: GetPostsQuery): Promise<GetPostsResponse> {
    let filteredPosts = [...this.posts];

    // ステータスでフィルタ
    if (query.status) {
      filteredPosts = filteredPosts.filter(
        (post) => post.status === query.status
      );
    }

    // 作成者でフィルタ
    if (query.author) {
      filteredPosts = filteredPosts.filter((post) =>
        post.author.toLowerCase().includes(query.author!.toLowerCase())
      );
    }

    // タグでフィルタ
    if (query.tag) {
      filteredPosts = filteredPosts.filter((post) =>
        post.tags?.some((tag) =>
          tag.toLowerCase().includes(query.tag!.toLowerCase())
        )
      );
    }

    // 作成日時でソート（新しいものから）
    filteredPosts.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // ページネーション
    const limit = query.limit || 10;
    const offset = query.offset || 0;
    const total = filteredPosts.length;

    const paginatedPosts = filteredPosts.slice(offset, offset + limit);

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
  }

  async getPostById(id: string): Promise<Post | null> {
    const post = this.posts.find((p) => p.id === id);
    return post || null;
  }

  async createPost(createRequest: CreatePostRequest): Promise<Post> {
    const now = new Date().toISOString();

    const newPost: Post = {
      id: (this.idCounter++).toString(),
      title: createRequest.title,
      content: createRequest.content,
      author: createRequest.author,
      createdAt: now,
      updatedAt: now,
      tags: createRequest.tags || [],
      status: createRequest.status || 'draft',
    };

    this.posts.push(newPost);
    return newPost;
  }

  async updatePost(
    id: string,
    updateRequest: UpdatePostRequest
  ): Promise<Post | null> {
    const postIndex = this.posts.findIndex((p) => p.id === id);

    if (postIndex === -1) {
      return null;
    }

    const existingPost = this.posts[postIndex];
    const now = new Date().toISOString();

    const updatedPost: Post = {
      ...existingPost,
      ...updateRequest,
      updatedAt: now,
    };

    this.posts[postIndex] = updatedPost;
    return updatedPost;
  }

  async deletePost(id: string): Promise<boolean> {
    const postIndex = this.posts.findIndex((p) => p.id === id);

    if (postIndex === -1) {
      return false;
    }

    this.posts.splice(postIndex, 1);
    return true;
  }

  // テスト用メソッド: データをリセット
  resetData(): void {
    this.posts = [
      {
        id: '1',
        title: 'Introduction to AWS Lambda',
        content: 'AWS Lambda is a serverless computing service...',
        author: 'John Doe',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
        tags: ['aws', 'lambda', 'serverless'],
        status: 'published',
      },
    ];
    this.idCounter = 2;
  }

  // テスト用メソッド: 全データを取得
  getAllPosts(): Post[] {
    return [...this.posts];
  }
}
