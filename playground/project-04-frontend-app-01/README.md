# Todo アプリ - CDK + Next.js

CDK を使用して、フルスタックの Todo アプリケーションを構築します。

## 構成

```
S3 (Next.js) → API Gateway → Lambda → DynamoDB
```

## 要件定義

### 機能要件

#### 1. Todo 一覧表示

- すべての Todo を一覧表示
- 完了/未完了のステータスを視覚的に表示
- 空の状態でも適切なメッセージを表示

#### 2. Todo 作成

- タイトルを入力して Todo を作成
- 作成時に自動的に ID とタイムスタンプを付与
- 作成後、一覧に即座に反映

#### 3. Todo 更新

- 完了/未完了のステータスをトグル
- タイトルの編集（オプション）

#### 4. Todo 削除

- 個別の Todo を削除
- 削除後、一覧から即座に削除

### 非機能要件

- **パフォーマンス**: API レスポンスタイム 200ms 以内
- **ユーザビリティ**: シンプルで直感的な UI
- **エラーハンドリング**: 適切なエラーメッセージ表示

### データモデル

```typescript
Todo {
  id: string;          // UUID
  title: string;       // Todoのタイトル
  completed: boolean;  // 完了フラグ
  createdAt: string;   // ISO8601形式のタイムスタンプ
  updatedAt: string;   // ISO8601形式のタイムスタンプ
}
```

### API 設計

#### GET /todos

- すべての Todo を取得
- レスポンス: `{ todos: Todo[] }`

#### POST /todos

- 新しい Todo を作成
- リクエスト: `{ title: string }`
- レスポンス: `{ todo: Todo }`

#### PUT /todos/{id}

- Todo のステータスを更新
- リクエスト: `{ completed: boolean }`
- レスポンス: `{ todo: Todo }`

#### DELETE /todos/{id}

- Todo を削除
- レスポンス: `{ message: string }`

## 実装ステップ

### Phase 1: インフラ構築 (CDK)

#### Step 1-1: DynamoDB テーブル作成 ✅

- [x] `lib/project-04-frontend-app-01-stack.ts` に DynamoDB テーブルを定義
- [x] パーティションキー: `id` (String)
- [x] `removalPolicy: DESTROY` で開発環境設定

#### Step 1-2: Lambda 関数作成 ✅

- [x] `lambda/todos/` ディレクトリを作成
- [x] CRUD 操作用の Lambda 関数を実装
  - [x] `getTodos.ts` - 一覧取得
  - [x] `createTodo.ts` - 作成
  - [x] `updateTodo.ts` - 更新
  - [x] `deleteTodo.ts` - 削除
- [x] DynamoDB SDK v3 を使用

#### Step 1-3: API Gateway 作成 ✅

- [x] REST API を作成
- [x] `/todos` リソースを作成
- [x] 各 HTTP メソッドと Lambda 関数を統合
- [x] CORS 設定を追加（重要！）

#### Step 1-4: S3 バケット作成 ✅

- [x] 静的ホスティング用の S3 バケットを作成
- [x] パブリックアクセス設定
- [x] BucketDeployment 設定（LocalStack では手動アップロード）

#### Step 1-5: デプロイとテスト ✅

- [x] `cdklocal bootstrap`
- [x] `cdklocal deploy`
- [x] API エンドポイント URL を確認
- [x] curl または VS Code REST Client で API をテスト
  - [x] GET /todos - 一覧取得
  - [x] POST /todos - 作成
  - [x] PUT /todos/{id} - 更新
  - [x] DELETE /todos/{id} - 削除

**API エンドポイント:** `https://rpreopc65q.execute-api.localhost.localstack.cloud:4566/prod/`

### Phase 2: フロントエンド実装 (Next.js)

#### Step 2-1: 環境設定

- [ ] `.env.local` に API エンドポイントを設定
- [ ] API クライアント関数を作成

#### Step 2-2: UI コンポーネント作成

- [ ] `TodoList` コンポーネント - 一覧表示
- [ ] `TodoItem` コンポーネント - 個別 Todo
- [ ] `TodoForm` コンポーネント - 新規作成フォーム

#### Step 2-3: 状態管理

- [ ] Todo 一覧の状態管理（useState または Zustand）
- [ ] API 呼び出しとローディング状態
- [ ] エラーハンドリング

#### Step 2-4: API 統合

- [ ] フェッチ処理の実装
- [ ] CRUD 操作の実装
- [ ] 楽観的更新の実装（オプション）

#### Step 2-5: スタイリング

- [ ] Tailwind CSS でスタイリング
- [ ] レスポンシブ対応
- [ ] ダークモード対応（既存の ThemeProvider を活用）

### Phase 3: デプロイと動作確認

#### Step 3-1: ビルドとデプロイ

- [ ] Next.js アプリをビルド
- [ ] S3 にアップロード（`awslocal s3 sync`）
- [ ] ブラウザで動作確認

#### Step 3-2: 統合テスト

- [ ] Todo 作成のテスト
- [ ] Todo 一覧表示のテスト
- [ ] Todo 完了/未完了の切り替えテスト
- [ ] Todo 削除のテスト

#### Step 3-3: エラーケーステスト

- [ ] ネットワークエラー時の挙動
- [ ] 不正なデータ入力時の挙動
- [ ] API エラー時のユーザーフィードバック

### Phase 4: 学習の振り返り

- [ ] README に学習内容をまとめる
- [ ] 躓いたポイントと解決方法を記録
- [ ] 次のプロジェクト（投票アプリ）への改善点を洗い出し

## プロジェクト構成

```
project-04-frontend-app-01/
├── lib/
│   └── project-04-frontend-app-01-stack.ts  # CDKスタック
├── lambda/
│   └── todos/
│       ├── getTodos.ts      # 一覧取得
│       ├── createTodo.ts    # 作成
│       ├── updateTodo.ts    # 更新
│       └── deleteTodo.ts    # 削除
├── frontend-nextjs/
│   ├── src/
│   │   ├── app/
│   │   │   └── todos/
│   │   │       └── page.tsx
│   │   ├── components/
│   │   │   ├── TodoList.tsx
│   │   │   ├── TodoItem.tsx
│   │   │   └── TodoForm.tsx
│   │   └── lib/
│   │       └── api.ts       # API クライアント
│   └── out/                  # ビルド成果物
└── README.md
```

## 学習ポイント

### CORS 設定

LocalStack や AWS では、フロントエンド(S3)と API Gateway 間の通信に CORS 設定が必須です。API Gateway で適切な CORS ヘッダーを設定します。

### DynamoDB の基本操作

- `PutItem` - データの作成
- `GetItem` / `Scan` - データの取得
- `UpdateItem` - データの更新
- `DeleteItem` - データの削除

### Lambda と API Gateway の統合

既に lambda/todos/ にひな型は作ってあるので、適宜改変する。

- Lambda プロキシ統合の理解
- イベントオブジェクトの構造
- レスポンスフォーマット（statusCode, headers, body）

### Next.js での API 呼び出し

- クライアントサイドでのデータフェッチ
- `use client` ディレクティブの使用
- エラーハンドリングとローディング状態

## API テスト方法

### 1. VS Code REST Client を使用（推奨）

`api-test.http` ファイルを開いて、各リクエストの上にある「Send Request」をクリック

### 2. curl コマンドを使用

```bash
# Todo一覧取得
curl -X GET https://rpreopc65q.execute-api.localhost.localstack.cloud:4566/prod/todos

# Todo作成
curl -X POST https://rpreopc65q.execute-api.localhost.localstack.cloud:4566/prod/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"Learn CDK"}'

# Todo更新（completed状態を変更）
curl -X PUT https://rpreopc65q.execute-api.localhost.localstack.cloud:4566/prod/todos/{id} \
  -H "Content-Type: application/json" \
  -d '{"completed":true}'

# Todo削除
curl -X DELETE https://rpreopc65q.execute-api.localhost.localstack.cloud:4566/prod/todos/{id}
```

## デプロイコマンド

### フロントエンドのデプロイ

```bash
# 方法1: ビルド+デプロイを一度に実行（推奨）
./scripts/build-and-deploy.sh

# 方法2: 既にビルド済みの場合、デプロイのみ
./scripts/deploy-frontend.sh
```

**注意:** LocalStack では`BucketDeployment`が動作しないため、`cdklocal deploy`後に手動でスクリプトを実行する必要があります。

### インフラのデプロイ

```bash
# 初回のみ: ブートストラップ
cdklocal bootstrap

# Lambda関数をビルド
cd lambda/todos && npm run build && cd ../..

# CDKスタックをデプロイ
cdklocal deploy

# フロントエンドをS3にアップロード（LocalStack用）
./scripts/deploy-frontend.sh
```

## Useful Commands

```bash
# CDK
cdklocal destroy          # スタックを削除
cdklocal diff             # 変更差分を確認
cdklocal synth            # CloudFormationテンプレートを生成

# Lambda関数のビルド
cd lambda/todos && npm run build && cd ../..

# Next.js（個別にビルド）
cd frontend-nextjs && npm run build && cd ..

# DynamoDB テーブル確認
awslocal dynamodb scan --table-name TodoTable

# S3バケットの内容確認
awslocal s3 ls s3://todo-app-bucket --recursive
```

## Useful commands

- `npm run build` - TypeScript をコンパイル
- `npm run watch` - ファイル変更を監視してコンパイル
- `npm run test` - Jest テストを実行
- `cdklocal bootstrap` - CDK 環境をブートストラップ
- `cdklocal deploy` - スタックをデプロイ
- `cdklocal destroy` - スタックを削除
- `cdklocal diff` - デプロイ済みスタックとの差分を確認
- `cdklocal synth` - CloudFormation テンプレートを生成
