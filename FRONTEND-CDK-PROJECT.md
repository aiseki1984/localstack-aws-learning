# CDK フロントエンド連携アプリ開発プロジェクト

CDK を使用して、S3 静的ホスティング + バックエンドリソースを連携したアプリケーションを構築する学習プロジェクトです。

## プロジェクト一覧

### 1. Todo アプリ ⭐⭐☆☆☆ (初級〜中級) 🌟 推奨

**構成**: S3 + API Gateway + Lambda + DynamoDB

**学習できること:**

- RESTful API の設計
- CORS 設定の理解
- DynamoDB の CRUD 操作
- Lambda と API Gateway の統合

**機能:**

- Todo の作成・取得・更新・削除
- フロントエンドから API を叩いて DynamoDB にデータ保存

**実装状況**: 🔜 未実装

---

### 2. リアルタイム投票アプリ ⭐⭐☆☆☆ (初級〜中級)

**構成**: S3 + API Gateway + Lambda + DynamoDB

**学習できること:**

- DynamoDB の集計クエリ
- 楽観的ロックと更新競合
- リアルタイムデータの扱い

**機能:**

- 投票項目の作成
- リアルタイムで投票結果を表示
- 投票数のカウント

**実装状況**: 🔜 未実装

---

### 3. 画像アップロード・ギャラリーアプリ ⭐⭐⭐☆☆ (中級)

**構成**: S3(Frontend) + S3(Images) + API Gateway + Lambda + DynamoDB

**学習できること:**

- S3 の署名付き URL（presigned URL）
- マルチバケット構成
- 画像メタデータの管理
- ファイルアップロードのセキュリティ

**機能:**

- 画像をアップロード
- アップロードした画像一覧を表示
- 画像メタデータを DynamoDB で管理

**実装状況**: 🔜 未実装

---

### 4. シンプルなブログ CMS ⭐⭐⭐☆☆ (中級)

**構成**: S3 + API Gateway + Lambda + DynamoDB + S3(画像)

**学習できること:**

- マークダウンエディタの統合
- リッチコンテンツの管理
- ページネーション
- 検索機能（DynamoDB Query/Scan）

**機能:**

- 記事の作成・編集・削除
- 記事一覧とプレビュー
- タグやカテゴリでの分類

**実装状況**: 🔜 未実装

---

### 5. コメント掲示板アプリ ⭐⭐⭐⭐☆ (中級〜上級)

**構成**: S3 + API Gateway + Lambda + DynamoDB + Cognito

**学習できること:**

- ユーザー認証（Cognito）
- 認証トークンの扱い
- ユーザーごとのデータ管理

**機能:**

- ユーザー登録・ログイン
- コメントの投稿・表示
- 自分のコメントのみ削除可能

**実装状況**: 🔜 未実装

---

## 開発の進め方

1. ✅ フロントエンド環境のセットアップ (Next.js)
2. 🔜 Todo アプリから順番に実装
3. 🔜 各アプリで学んだことを次に活かす
4. 🔜 最終的に認証機能まで習得

## Useful commands

- `npm run build` - TypeScript をコンパイル
- `npm run watch` - ファイル変更を監視してコンパイル
- `npm run test` - Jest テストを実行
- `cdklocal bootstrap` - CDK 環境をブートストラップ
- `cdklocal deploy` - スタックをデプロイ
- `cdklocal destroy` - スタックを削除
- `cdklocal diff` - デプロイ済みスタックとの差分を確認
- `cdklocal synth` - CloudFormation テンプレートを生成
