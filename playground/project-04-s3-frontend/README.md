# CDK を使った S3 静的ホスティング

CDK を使用して Next.js アプリを S3 にデプロイし、静的ホスティングを行うプロジェクトです。

## プロジェクト構成

```
project-04-s3-frontend/
├── lib/
│   └── project-04-s3-frontend-stack.ts  # CDKスタック定義
├── bin/
│   └── project-04-s3-frontend.ts        # CDKアプリエントリーポイント
└── frontend-nextjs/                      # Next.jsアプリケーション
    ├── src/
    └── out/                              # ビルド成果物（デプロイ対象）
```

## 実装内容

### CDK スタックの主要な設定

- **S3 バケット**: 静的ホスティング用のパブリックアクセス可能なバケット

  - `publicReadAccess: true`: すべてのユーザーが読み取り可能
  - `blockPublicAccess`: すべて`false`に設定（完全なパブリックアクセス）
  - `removalPolicy: DESTROY`: スタック削除時にバケットも削除
  - `autoDeleteObjects: true`: バケット削除時にオブジェクトも自動削除

- **BucketDeployment**: Next.js のビルド成果物を自動デプロイ
  - `prune: true`: 古いファイルを自動削除（更新時に重要）
  - `memoryLimit: 512`: デプロイ Lambda のメモリ設定

### デプロイ手順

```bash
# 1. 初回のみ: CDK環境のブートストラップ
cdklocal bootstrap

# 2. Next.jsアプリのビルド
cd frontend-nextjs && npm run build && cd ..

# 3. CDKスタックのデプロイ
cdklocal deploy

# 4. ⚠️ LocalStack制限: BucketDeploymentが動作しないため、手動でファイルをアップロード
awslocal s3 sync ./frontend-nextjs/out s3://sample-bucket

# 5. アクセス
# http://sample-bucket.s3.localhost.localstack.cloud:4566/index.html
```

**LocalStack での注意点:**

LocalStack では`BucketDeployment`が正しく動作しないことがあります。そのため、`cdklocal deploy`後に手動で`awslocal s3 sync`を実行してファイルをアップロードする必要があります。

本番の AWS 環境では、`BucketDeployment`が正常に動作し、自動的にファイルがアップロードされます。

### クリーンアップ

```bash
cdklocal destroy
```

スタックを削除すると、`autoDeleteObjects: true`により、バケット内のオブジェクトも自動的に削除されます。

## 学習ポイント

### BlockPublicAccess の設定

手動での S3 設定と同等の内容を CDK で実現：

```typescript
blockPublicAccess: new s3.BlockPublicAccess({
  blockPublicAcls: false, // 新しいパブリックACLを許可
  ignorePublicAcls: false, // 既存のパブリックACLを有効化
  blockPublicPolicy: false, // パブリックバケットポリシーを許可
  restrictPublicBuckets: false, // クロスアカウントアクセスを許可
});
```

### BucketDeployment の自動化

CDK の`BucketDeployment`は以下を自動的に行います：

1. ビルド成果物（`out`ディレクトリ）を S3 にアップロード
2. 変更があったファイルのみ更新（ハッシュベース）
3. `prune: true`により不要なファイルを削除

## 実際の開発での考慮事項

### CDK 内でのビルドについて

**このプロジェクトの方式（CDK 内でビルド）:**

- ✅ 学習・検証目的には最適
- ✅ シンプルで理解しやすい
- ❌ 本番環境には推奨されない

**本番環境での推奨構成:**

```
開発フロー:
Next.js開発者 → Git push → CI/CD Pipeline
                              ↓
                         1. npm run build
                         2. cdk deploy（インフラ）
                         3. S3 sync（ビルド成果物）
```

**理由:**

- **関心の分離**: フロントエンド開発者はインフラを意識せず開発できる
- **ビルドの独立性**: Next.js のビルドを CI/CD パイプラインで管理
- **デプロイの柔軟性**: インフラ変更とアプリ更新を独立して実行可能
- **パフォーマンス**: CDK デプロイ時にビルド時間が含まれない

### 実際の Next.js on S3 のユースケース

Next.js の静的エクスポート（`output: 'export'`）を使用する場合：

- ランディングページ
- ドキュメントサイト
- ブログなどの静的コンテンツ

**注意**: Server-Side Rendering（SSR）や API Routes が必要な場合は、Vercel や AWS Amplify、または Lambda@Edge などの別のソリューションが必要です。

## 参考コマンド

```bash
# CDKスタックの差分確認
cdklocal diff

# CloudFormationテンプレートの生成
cdklocal synth

# TypeScriptのコンパイル
npm run build

# テストの実行
npm run test
```
