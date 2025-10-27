# Project 02: シンプルなブログ API (Lambda + API Gateway + S3)

## 概要

AWS CLI を使用して、ブログ記事を JSON 形式で S3 に保存・管理するシンプルな REST API を構築する学習プロジェクトです。LocalStack 環境を使用してファイル操作の心配なく安全に学習できます。

## 学習目的

- S3 の基本操作（PUT/GET/DELETE/LIST）を習得
- JSON データの S3 での管理方法を理解
- Lambda と S3 の連携方法を学習
- REST API の CRUD 操作を実装
- オブジェクトキー設計の考え方を理解

## 使用技術スタック

### 🛠️ インフラストラクチャ

- **LocalStack**: ローカル AWS 環境シミュレーター
- **Amazon S3**: ブログ記事データの保存
- **AWS Lambda**: ビジネスロジックの実行
- **API Gateway**: REST API のエンドポイント提供

### 💻 アプリケーション

- **Node.js (v22.x)**: Lambda 関数のランタイム
- **JavaScript**: Lambda 関数の実装言語
- **JSON**: ブログ記事のデータ形式

## API 仕様

### エンドポイント一覧

| メソッド | パス          | 説明             | 実装順序   |
| -------- | ------------- | ---------------- | ---------- |
| `POST`   | `/posts`      | 新しい記事を作成 | ⭐ Phase 1 |
| `GET`    | `/posts`      | 記事一覧を取得   | ⭐ Phase 2 |
| `GET`    | `/posts/{id}` | 特定の記事を取得 | ⭐ Phase 3 |
| `PUT`    | `/posts/{id}` | 記事を更新       | Phase 4    |
| `DELETE` | `/posts/{id}` | 記事を削除       | Phase 5    |

### データ構造

```json
{
  "id": "post-20251027-001",
  "title": "Hello World",
  "content": "これは最初のブログ記事です。",
  "author": "developer",
  "created_at": "2025-10-27T10:00:00Z",
  "updated_at": "2025-10-27T10:00:00Z",
  "tags": ["hello", "first-post"]
}
```

### S3 オブジェクトキー設計

```
blog-posts/
├── post-20251027-001.json    # 個別記事
├── post-20251027-002.json
├── post-20251028-001.json
└── metadata/
    └── posts-index.json       # 記事一覧のメタデータ
```

## プロジェクト構成

```
project-02/
├── readme.md                     # このファイル
├── lambda/
│   ├── blog-api.js              # メインの Lambda 関数
│   └── blog-api.zip             # デプロイ用 ZIP
├── scripts/
│   ├── 01_setup_s3.sh          # S3 バケット作成
│   ├── 02_setup_lambda.sh      # Lambda 関数作成
│   ├── 03_setup_apigateway.sh  # API Gateway 作成
│   ├── 04_test_api.sh          # API テスト
│   └── 05_cleanup.sh           # クリーンアップ
├── test/
│   ├── sample-posts.json       # テスト用記事データ
│   └── api-test-commands.md    # テストコマンド集
└── docs/
    ├── 01_s3_setup.md          # S3 セットアップ詳細
    ├── 02_lambda_functions.md   # Lambda 関数詳細
    └── 03_api_testing.md       # API テスト方法
```

## 実装手順

### Phase 1: 基盤構築 🏗️

#### 1. S3 バケットの作成

```bash
# バケット作成
aws s3 mb s3://blog-api-storage

# バケット確認
aws s3 ls

# フォルダ構造作成（オプション）
aws s3api put-object --bucket blog-api-storage --key blog-posts/
aws s3api put-object --bucket blog-api-storage --key metadata/
```

#### 2. Lambda 実行ロールの準備

```bash
# S3 アクセス権限付きのロールを使用
# LocalStack では標準のロールを使用可能
```

#### 3. Lambda 関数の作成

```bash
# Lambda 関数ファイルの作成
cat > lambda/blog-api.js << 'EOF'
const AWS = require('aws-sdk');
const s3 = new AWS.S3({
    endpoint: process.env.AWS_ENDPOINT_URL || 'http://localhost:4566',
    s3ForcePathStyle: true
});

const BUCKET_NAME = 'blog-api-storage';

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));

    try {
        const method = event.httpMethod;
        const path = event.path;
        const pathParameters = event.pathParameters || {};

        switch (method) {
            case 'POST':
                if (path === '/posts') {
                    return await createPost(event);
                }
                break;
            case 'GET':
                if (path === '/posts') {
                    return await listPosts();
                } else if (pathParameters.id) {
                    return await getPost(pathParameters.id);
                }
                break;
            case 'PUT':
                if (pathParameters.id) {
                    return await updatePost(pathParameters.id, event);
                }
                break;
            case 'DELETE':
                if (pathParameters.id) {
                    return await deletePost(pathParameters.id);
                }
                break;
        }

        return {
            statusCode: 404,
            body: JSON.stringify({ message: 'Not Found' })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Internal Server Error',
                error: error.message
            })
        };
    }
};

// 記事作成
async function createPost(event) {
    const body = JSON.parse(event.body);
    const postId = `post-${new Date().toISOString().split('T')[0]}-${Date.now()}`;

    const post = {
        id: postId,
        title: body.title,
        content: body.content,
        author: body.author || 'anonymous',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: body.tags || []
    };

    await s3.putObject({
        Bucket: BUCKET_NAME,
        Key: `blog-posts/${postId}.json`,
        Body: JSON.stringify(post, null, 2),
        ContentType: 'application/json'
    }).promise();

    return {
        statusCode: 201,
        body: JSON.stringify(post)
    };
}

// 記事一覧取得
async function listPosts() {
    const objects = await s3.listObjectsV2({
        Bucket: BUCKET_NAME,
        Prefix: 'blog-posts/',
        Delimiter: '/'
    }).promise();

    const posts = [];
    for (const obj of objects.Contents || []) {
        if (obj.Key.endsWith('.json')) {
            const postData = await s3.getObject({
                Bucket: BUCKET_NAME,
                Key: obj.Key
            }).promise();

            const post = JSON.parse(postData.Body.toString());
            posts.push({
                id: post.id,
                title: post.title,
                author: post.author,
                created_at: post.created_at,
                tags: post.tags
            });
        }
    }

    return {
        statusCode: 200,
        body: JSON.stringify({
            posts: posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
            total: posts.length
        })
    };
}

// 特定記事取得
async function getPost(postId) {
    try {
        const postData = await s3.getObject({
            Bucket: BUCKET_NAME,
            Key: `blog-posts/${postId}.json`
        }).promise();

        const post = JSON.parse(postData.Body.toString());
        return {
            statusCode: 200,
            body: JSON.stringify(post)
        };
    } catch (error) {
        if (error.code === 'NoSuchKey') {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Post not found' })
            };
        }
        throw error;
    }
}

// 記事更新
async function updatePost(postId, event) {
    const body = JSON.parse(event.body);

    try {
        // 既存記事を取得
        const existingData = await s3.getObject({
            Bucket: BUCKET_NAME,
            Key: `blog-posts/${postId}.json`
        }).promise();

        const existingPost = JSON.parse(existingData.Body.toString());

        // 更新
        const updatedPost = {
            ...existingPost,
            title: body.title || existingPost.title,
            content: body.content || existingPost.content,
            author: body.author || existingPost.author,
            tags: body.tags || existingPost.tags,
            updated_at: new Date().toISOString()
        };

        await s3.putObject({
            Bucket: BUCKET_NAME,
            Key: `blog-posts/${postId}.json`,
            Body: JSON.stringify(updatedPost, null, 2),
            ContentType: 'application/json'
        }).promise();

        return {
            statusCode: 200,
            body: JSON.stringify(updatedPost)
        };
    } catch (error) {
        if (error.code === 'NoSuchKey') {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Post not found' })
            };
        }
        throw error;
    }
}

// 記事削除
async function deletePost(postId) {
    try {
        await s3.deleteObject({
            Bucket: BUCKET_NAME,
            Key: `blog-posts/${postId}.json`
        }).promise();

        return {
            statusCode: 204,
            body: ''
        };
    } catch (error) {
        return {
            statusCode: 404,
            body: JSON.stringify({ message: 'Post not found' })
        };
    }
}
EOF

# ZIP ファイル作成
cd lambda
zip blog-api.zip blog-api.js
cd ..
```

#### 4. Lambda 関数のデプロイ

```bash
# Lambda 関数作成
aws lambda create-function \
    --function-name blog-api \
    --runtime nodejs22.x \
    --zip-file fileb://lambda/blog-api.zip \
    --handler blog-api.handler \
    --role arn:aws:iam::000000000000:role/lambda-role
```

### Phase 2: API Gateway セットアップ 🌐

#### 1. REST API 作成

```bash
# REST API 作成
aws apigateway create-rest-api \
    --name 'BlogAPI' \
    --description 'Simple Blog API with S3 storage'
```

#### 2. リソースとメソッドの設定

```bash
# 変数設定
API_ID=$(aws apigateway get-rest-apis --query 'items[?name==`BlogAPI`].id' --output text)
PARENT_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query 'items[0].id' --output text)

# /posts リソース作成
POSTS_RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $PARENT_ID \
    --path-part 'posts' \
    --query 'id' --output text)

# /posts/{id} リソース作成
POST_ID_RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $POSTS_RESOURCE_ID \
    --path-part '{id}' \
    --query 'id' --output text)
```

### Phase 3: テストとデバッグ 🧪

#### API テスト例

```bash
# 記事作成
curl -X POST "http://localhost:4566/restapis/$API_ID/dev/_user_request_/posts" \
    -H "Content-Type: application/json" \
    -d '{
        "title": "Hello LocalStack",
        "content": "これは最初のテスト記事です",
        "author": "developer",
        "tags": ["test", "localstack"]
    }'

# 記事一覧取得
curl "http://localhost:4566/restapis/$API_ID/dev/_user_request_/posts"

# 特定記事取得
curl "http://localhost:4566/restapis/$API_ID/dev/_user_request_/posts/{POST_ID}"
```

## 学習ポイント

### 🎯 S3 の理解

- **オブジェクトキー設計**: 階層的なデータ管理
- **JSON データの保存**: 構造化データの S3 活用
- **リスト操作**: Prefix を使った効率的な検索

### 💡 Lambda の実践

- **複数パス処理**: 単一関数での CRUD 実装
- **エラーハンドリング**: S3 操作のエラー処理
- **JSON パース**: リクエスト・レスポンス処理

### 🔧 AWS CLI スキル

- **S3 操作**: mb, ls, cp, rm コマンド
- **Lambda 管理**: 関数の更新・テスト
- **API Gateway**: 複数リソースの管理

## 発展課題

1. **検索機能**: タグやタイトルでの記事検索
2. **ページネーション**: 大量記事への対応
3. **バリデーション**: 入力データの検証
4. **メタデータ管理**: 記事統計の S3 保存
5. **エラーログ**: CloudWatch ログの活用

## 次のステップ

このプロジェクト完了後の学習方向：

- **ファイルアップロード API**: バイナリデータの処理
- **DynamoDB 版**: NoSQL データベースでの実装
- **IaC 化**: CloudFormation/CDK での自動化

---

このプロジェクトで、AWS のサーバーレスアーキテクチャと S3 でのデータ管理の基礎をしっかり学習しましょう！
