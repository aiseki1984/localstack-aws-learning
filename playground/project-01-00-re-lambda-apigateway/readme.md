# Lambda TypeScript + API Gateway プロジェクト

AWS Lambda(TypeScript) + API Gateway を使った学習用 REST API プロジェクトです。
記事投稿システムの CRUD API を実装し、LocalStack 環境でのテスト・デプロイ方法を学習できます。

## 📋 プロジェクト概要

- **目的**: Lambda + API Gateway + TypeScript の学習
- **機能**: 記事（Post）の CRUD 操作
- **データ**: インメモリ（ダミーデータ）
- **環境**: LocalStack（AWS サービスエミュレーション）
- **テスト**: Vitest を使った包括的なテスト
- **ビルド**: esbuild による高速ビルド

## 🏗️ プロジェクト構造

```
project-01-00-re-lambda-apigateway/
├── readme.md                     # プロジェクトドキュメント
├── lambda/                       # Lambda関数
│   ├── package.json              # 依存関係とスクリプト
│   ├── tsconfig.json             # TypeScript設定
│   ├── vitest.config.ts          # テスト設定
│   └── src/
│       ├── index.ts              # メインハンドラー
│       ├── index.test.ts         # ハンドラーのテスト
│       ├── posts-service.ts      # ビジネスロジック
│       └── types.ts              # 型定義
└── scripts/
    ├── deploy.sh                 # デプロイスクリプト
    └── cleanup.sh                # リソース削除スクリプト
```

## 🚀 API エンドポイント

実装されている CRUD 操作：

| メソッド  | エンドポイント          | 説明                                             |
| --------- | ----------------------- | ------------------------------------------------ |
| `GET`     | `/posts`                | 記事一覧の取得（フィルタ・ページネーション対応） |
| `GET`     | `/posts/{id}`           | 特定記事の取得                                   |
| `POST`    | `/posts`                | 新規記事の作成                                   |
| `PUT`     | `/posts/{id}`           | 記事の更新                                       |
| `DELETE`  | `/posts/{id}`           | 記事の削除                                       |
| `OPTIONS` | `/posts`, `/posts/{id}` | CORS 対応                                        |

### クエリパラメータ（GET /posts）

- `limit`: 取得件数制限（デフォルト: 10）
- `offset`: 取得開始位置（デフォルト: 0）
- `status`: ステータスフィルタ（`draft`, `published`, `archived`）
- `author`: 作成者フィルタ
- `tag`: タグフィルタ

### リクエスト・レスポンス例

**POST /posts**

```json
{
  "title": "Lambda入門",
  "content": "Lambda関数の基本的な使い方について説明します...",
  "author": "John Doe",
  "tags": ["aws", "lambda", "serverless"],
  "status": "draft"
}
```

**レスポンス**

```json
{
  "success": true,
  "data": {
    "id": "4",
    "title": "Lambda入門",
    "content": "Lambda関数の基本的な使い方について説明します...",
    "author": "John Doe",
    "createdAt": "2024-11-04T12:00:00Z",
    "updatedAt": "2024-11-04T12:00:00Z",
    "tags": ["aws", "lambda", "serverless"],
    "status": "draft"
  },
  "message": "Post created successfully"
}
```

## 🔧 開発環境のセットアップ

### 前提条件

- Node.js 18.x 以降
- LocalStack 環境
- AWS CLI

### インストール

```bash
# プロジェクトディレクトリに移動
cd lambda/

# 依存関係のインストール
npm install
```

## 🧪 テスト実行

包括的なテストスイート（15 のテストケース）が実装されています。

```bash
# ワッチモードでテスト実行
npm test

# 一度だけテスト実行
npm run test:run

# テスト結果の確認
# ✓ GET /posts の動作確認
# ✓ POST /posts のバリデーション
# ✓ PUT /posts/{id} の更新処理
# ✓ DELETE /posts/{id} の削除処理
# ✓ CORS とエラーハンドリング
```

### テストカバレッジ

- ✅ 全 HTTP メソッドの動作テスト
- ✅ パラメータバリデーション
- ✅ エラーハンドリング（404, 400, 405, 500）
- ✅ CORS 対応の確認
- ✅ フィルタリング・ページネーション

## 🚀 デプロイメント

### LocalStack へのデプロイ

```bash
# 環境変数設定
export AWS_ENDPOINT_URL=http://localstack:4566

# デプロイ実行
./scripts/deploy.sh
```

デプロイされるリソース：

- Lambda 関数: `posts-api-lambda`
- IAM ロール: `lambda-api-execution-role`
- API Gateway: `posts-api`

### API テスト

デプロイ後、以下のコマンドで API をテストできます：

```bash
# 基本URL（デプロイ時に表示される）
API_ENDPOINT="http://localstack:4566/restapis/{API_ID}/dev/_user_request_"

# 記事一覧取得
curl "$API_ENDPOINT/posts"

# 特定記事取得
curl "$API_ENDPOINT/posts/1"

# 新規記事作成
curl -X POST "$API_ENDPOINT/posts" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "新しい記事",
    "content": "記事の内容です",
    "author": "テスト太郎",
    "tags": ["test"],
    "status": "draft"
  }'

# 記事更新
curl -X PUT "$API_ENDPOINT/posts/1" \
  -H "Content-Type: application/json" \
  -d '{"title": "更新されたタイトル"}'

# 記事削除
curl -X DELETE "$API_ENDPOINT/posts/1"
```

## 🧹 リソース削除

```bash
# 作成したAWSリソースを全て削除
export AWS_ENDPOINT_URL=http://localstack:4566
./scripts/cleanup.sh
```

## 💻 開発用スクリプト

```bash
# TypeScript開発（ウォッチモード）
npm run dev

# ビルド実行
npm run build

# 型チェック
npm run typecheck

# デプロイ（npm経由）
npm run deploy

# クリーンアップ（npm経由）
npm run cleanup
```

## 🏗️ アーキテクチャの特徴

### TypeScript 型安全性

- 厳密な型定義（`Post`, `ApiResponse`, `GetPostsQuery` など）
- リクエスト・レスポンスの型チェック
- エラーハンドリングの型安全性

### モダンな開発環境

- **esbuild**: 高速ビルド・バンドル
- **Vitest**: 高速テスト実行・ホットリロード
- **TypeScript**: 型安全性・開発効率

### 本番対応設計

- CORS 対応
- 包括的エラーハンドリング
- 構造化ログ出力
- Lambda 最適化（バンドルサイズ最小化）

### テスト戦略

1. **単体テスト**: ビジネスロジックの詳細テスト
2. **統合テスト**: Lambda ハンドラーの動作確認
3. **E2E テスト**: API Gateway 経由の実際の HTTP テスト

## 📚 学習ポイント

このプロジェクトで学習できる内容：

1. **Lambda 関数の基本構造**: ハンドラー、コンテキスト、レスポンス形式
2. **API Gateway 統合**: プロキシ統合、ルーティング、CORS
3. **TypeScript 活用**: 型安全な API 開発
4. **テスト駆動開発**: 包括的なテストスイート作成
5. **自動化**: デプロイ・クリーンアップスクリプト
6. **LocalStack**: AWS サービスのローカル開発環境

## 🔄 次のステップ

1. **データ永続化**: DynamoDB 統合
2. **認証・認可**: JWT トークン認証
3. **バリデーション強化**: Joi/Zod スキーマ
4. **ログ機能**: CloudWatch Logs 統合
5. **パフォーマンス**: Cold Start 最適化

## 🐛 トラブルシューティング

### よくある問題

**Q: デプロイが失敗する**

```bash
# LocalStack が起動しているか確認
docker ps | grep localstack

# 環境変数が設定されているか確認
echo $AWS_ENDPOINT_URL
```

**Q: テストが失敗する**

```bash
# 依存関係の再インストール
rm -rf node_modules package-lock.json
npm install
```

**Q: API が応答しない**

```bash
# Lambda関数の状態確認
aws lambda get-function --function-name posts-api-lambda \
  --endpoint-url=$AWS_ENDPOINT_URL --region us-east-1
```

---

このプロジェクトは学習用に作成されており、実際の本番環境に適用する際は、セキュリティ、パフォーマンス、監視などの追加要件を考慮してください。
