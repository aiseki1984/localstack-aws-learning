# LocalStack 運用ガイド: つらみと強み

## 📋 目次

- [LocalStack とは](#localstackとは)
- [つらみ(制約・問題点)](#つらみ制約問題点)
- [強み(メリット)](#強みメリット)
- [本番 AWS との違い](#本番awsとの違い)
- [無料版 vs Pro 版](#無料版-vs-pro版)
- [実践的な対処法](#実践的な対処法)

---

## LocalStack とは

LocalStack は AWS クラウドサービスをローカル環境でエミュレートするツールです。

- **公式サイト**: https://localstack.cloud/
- **GitHub**: https://github.com/localstack/localstack
- **対応サービス**: S3, Lambda, DynamoDB, API Gateway, CloudFormation など 80+ のサービス

---

## つらみ(制約・問題点)

### 1. CDK Construct の一部が動かない

**問題**: `BucketDeployment` (aws-cdk-lib/aws-s3-deployment) が機能しない

```typescript
// ❌ LocalStackでは動かない
new s3deploy.BucketDeployment(this, 'DeployWebsite', {
  sources: [s3deploy.Source.asset('./frontend-nextjs/out')],
  destinationBucket: bucket,
});
```

**原因**:

- `BucketDeployment` は内部でカスタムリソース(Lambda 関数)を使用
- LocalStack 無料版はカスタムリソースの一部をサポートしていない

**対処法**: 手動でデプロイスクリプトを作成

```bash
#!/bin/bash
# scripts/deploy-frontend.sh
awslocal s3 rm s3://todo-app-bucket --recursive
awslocal s3 sync frontend-nextjs/out/ s3://todo-app-bucket/
```

**影響**:

- CI/CD で本番と LocalStack で異なるデプロイフローが必要
- `cdk deploy`だけで完結しない

---

### 2. レスポンスが遅い

**問題**: API 呼び出しや Lambda 実行が本番 AWS より 3-5 倍遅い

**具体例**:

- Lambda Cold Start: 本番 200-500ms → LocalStack 1-2 秒
- DynamoDB Scan: 本番 50-100ms → LocalStack 200-500ms
- API Gateway 呼び出し: 本番 100ms → LocalStack 500ms-1 秒

**原因**:

- Docker コンテナ内でのエミュレーション
- Python で実装されたエミュレーションレイヤー
- ローカルマシンのリソース制約

**対処法**:

```typescript
// Playwright テストでタイムアウトを延長
export default defineConfig({
  timeout: 60000, // 60秒(本番なら30秒で十分)
  expect: {
    timeout: 10000, // アサーションも長めに
  },
});
```

**影響**:

- E2E テストの実行時間が長い(本番の 2-3 倍)
- 開発時のイテレーションが遅い

---

### 3. 並列実行に弱い

**問題**: 複数の API リクエストを同時に送ると不安定

**具体例**:

```typescript
// ❌ LocalStackで不安定になりやすい
await Promise.all([fetch('/todos'), fetch('/todos'), fetch('/todos')]);
```

**原因**:

- シングルコンテナで全サービスをエミュレート
- 内部のリソース競合

**対処法**:

```typescript
// Playwright で並列実行を無効化
export default defineConfig({
  workers: 1, // 1テストずつ実行(本番なら4-8推奨)
});
```

**影響**:

- テスト実行時間が長くなる
- 負荷テストができない

---

### 4. エンドポイント URL の扱いが特殊

**問題**: LocalStack は全サービスを `localhost:4566` に集約

**具体例**:

```typescript
// 本番AWS
const apiUrl = 'https://abc123.execute-api.us-east-1.amazonaws.com/prod/';
const s3Url = 'https://my-bucket.s3.us-east-1.amazonaws.com/';

// LocalStack
const apiUrl =
  'https://abc123.execute-api.localhost.localstack.cloud:4566/prod/';
const s3Url = 'http://my-bucket.s3.localhost.localstack.cloud:4566/';
```

**注意点**:

- Lambda 関数内では `AWS_ENDPOINT_URL` を**設定してはいけない**(自動設定される)
- フロントエンドからの呼び出しは明示的に LocalStack の URL を指定

**影響**:

- 環境変数の管理が複雑化
- `.env.local` と `.env.production` を分ける必要あり

---

### 5. CloudWatch Logs の閲覧が不便

**問題**: AWS コンソールのような UI がない

**対処法**:

```bash
# ログストリーム一覧
awslocal logs describe-log-streams \
  --log-group-name /aws/lambda/getTodos

# ログ表示(tail -f 的な使い方)
awslocal logs tail /aws/lambda/getTodos --follow

# 特定時間範囲のログ
awslocal logs filter-log-events \
  --log-group-name /aws/lambda/getTodos \
  --start-time 1700000000000
```

**影響**:

- デバッグ時に CLI コマンドを覚える必要がある
- GUI での直感的な操作ができない

---

### 6. IAM ポリシーの検証が甘い

**問題**: 本番では拒否されるリクエストが LocalStack では通る

**具体例**:

```typescript
// 本番: Lambda に DynamoDB の権限がない → エラー
// LocalStack: 権限チェックが甘く、動いてしまうことがある
```

**対処法**:

- `table.grantReadWriteData(lambda)` を必ず使う(明示的に権限付与)
- 本番デプロイ前に必ずステージング環境でテスト

**影響**:

- LocalStack で動いても本番でエラーになる可能性
- セキュリティテストが不完全

---

### 7. リージョンの概念が薄い

**問題**: LocalStack は全リソースが同一リージョン扱い

```typescript
// 本番: us-east-1 と ap-northeast-1 で分離
// LocalStack: 全て us-east-1 として扱われる(設定次第)
```

**影響**:

- マルチリージョン構成のテストができない
- レイテンシーのシミュレーションができない

---

## 強み(メリット)

### 1. 💰 完全無料で学習・開発できる

**比較**:
| 項目 | 本番 AWS | LocalStack |
|------|---------|------------|
| DynamoDB | $0.25/GB/月 | 無料 |
| Lambda | 100 万リクエスト無料後 $0.20/100 万 | 無料 |
| API Gateway | $3.50/100 万リクエスト | 無料 |
| S3 | $0.023/GB/月 | 無料 |

**実例**: 今回の Todo アプリを本番 AWS で 1 ヶ月運用すると約 $5-10
→ LocalStack なら $0

---

### 2. 🚀 高速なイテレーション

**デプロイ速度**:

```bash
# 本番AWS
cdk deploy  # 3-5分(CloudFormationスタック作成)

# LocalStack
cdklocal deploy  # 30秒-1分(エミュレーション)
```

**削除速度**:

```bash
# 本番AWS
cdk destroy  # 3-5分(リソース削除待ち)

# LocalStack
cdklocal destroy  # 10-20秒
# または docker compose down で即座に全削除
```

**影響**:

- 試行錯誤のサイクルが圧倒的に速い
- 失敗を恐れずに実験できる

---

### 3. 🔒 完全にローカルで完結

**メリット**:

- インターネット接続不要(初回の Docker イメージ取得後)
- AWS アカウント不要
- クレジットカード登録不要
- 課金の心配ゼロ

**セキュリティ**:

- 本番データをローカルにコピーしてテスト可能
- 機密情報が外部に漏れるリスクなし

---

### 4. 🧪 CI/CD に組み込みやすい

**GitHub Actions の例**:

```yaml
- name: Start LocalStack
  run: |
    docker compose up -d
    sleep 10

- name: Run E2E Tests
  run: npm run test:e2e

- name: Stop LocalStack
  run: docker compose down
```

**メリット**:

- PR ごとに E2E テストを実行できる
- 本番環境を汚さない
- 並列実行でコスト削減(無料なので)

---

### 5. 📚 教育・学習に最適

**初心者にやさしい理由**:

- AWS 課金を気にせず試行錯誤できる
- `docker compose down` で即座にリセット
- 失敗してもリソースが残らない(本番だと削除忘れで課金)

**チーム開発**:

- 全員が同じ環境を構築できる(`docker compose.yml` 共有)
- オンボーディングが簡単

---

### 6. 🎯 オフライン開発が可能

**ユースケース**:

- 飛行機の中でコーディング
- カフェでの開発(Wi-Fi 不要)
- ネットワーク障害時も作業継続

---

### 7. 🧹 クリーンな環境リセット

```bash
# 全リソースを削除して再起動
docker compose down
docker compose up -d
cdklocal deploy
```

**本番 AWS だと**:

- リソースの削除漏れが発生しやすい
- S3 バケットの中身を全削除してから削除が必要
- IAM ロールの依存関係で削除できないことも

---

## 本番 AWS との違い

### アーキテクチャ

| 項目         | 本番 AWS           | LocalStack             |
| ------------ | ------------------ | ---------------------- |
| 実体         | AWS データセンター | Docker コンテナ        |
| スケール     | 自動スケール       | 単一コンテナ(制限あり) |
| 可用性       | 99.99% SLA         | ローカルマシン依存     |
| レイテンシー | リージョン依存     | ほぼゼロ(ローカル)     |
| 永続化       | 永続               | デフォルトは揮発性     |

### サポートされるサービス

| サービス       | 本番 AWS | LocalStack 無料版 | LocalStack Pro |
| -------------- | -------- | ----------------- | -------------- |
| S3             | ✅       | ✅                | ✅             |
| Lambda         | ✅       | ✅                | ✅             |
| DynamoDB       | ✅       | ✅                | ✅             |
| API Gateway    | ✅       | ✅(一部制限)      | ✅             |
| CloudFormation | ✅       | ✅(一部制限)      | ✅             |
| Cognito        | ✅       | ❌                | ✅             |
| RDS            | ✅       | ❌                | ✅             |
| ECS/Fargate    | ✅       | ❌                | ✅             |
| Step Functions | ✅       | ❌                | ✅             |
| AppSync        | ✅       | ❌                | ✅             |

### エンドポイント構造

```typescript
// 本番AWS: サービスごとに異なるエンドポイント
const s3Endpoint = 'https://s3.ap-northeast-1.amazonaws.com';
const dynamoEndpoint = 'https://dynamodb.ap-northeast-1.amazonaws.com';
const lambdaEndpoint = 'https://lambda.ap-northeast-1.amazonaws.com';

// LocalStack: 全サービスが localhost:4566 に集約
const allServices = 'http://localhost:4566';
```

---

## 無料版 vs Pro 版

### 機能比較

| 機能                                  | 無料版       | Pro 版($49/月) |
| ------------------------------------- | ------------ | -------------- |
| コアサービス(S3, Lambda, DynamoDB 等) | ✅           | ✅             |
| Cognito                               | ❌           | ✅             |
| RDS(PostgreSQL, MySQL)                | ❌           | ✅             |
| ECS/Fargate                           | ❌           | ✅             |
| Step Functions                        | ❌           | ✅             |
| AppSync(GraphQL)                      | ❌           | ✅             |
| CloudWatch Logs Insights              | ❌           | ✅             |
| IAM ポリシー完全シミュレート          | ❌           | ✅             |
| データ永続化                          | 手動         | 自動           |
| スナップショット/リストア             | ❌           | ✅             |
| CI/CD 統合ツール                      | 基本         | 高度           |
| サポート                              | コミュニティ | 公式サポート   |

### 今回のプロジェクトでの判断

**無料版で十分な理由**:

- 使用したサービス: S3, Lambda, DynamoDB, API Gateway
- 全て無料版でサポートされている
- Cognito や RDS は使っていない

**Pro 版が必要になるケース**:

- ユーザー認証が必要(Cognito)
- PostgreSQL/MySQL を使いたい(RDS)
- GraphQL API を作りたい(AppSync)
- マイクロサービス間の複雑なワークフロー(Step Functions)

---

## 実践的な対処法

### 1. BucketDeployment 問題の解決

**スクリプト化**:

```bash
#!/bin/bash
# scripts/deploy-frontend.sh
set -e

echo "Building Next.js app..."
cd frontend-nextjs
npm run build

echo "Deploying to S3..."
cd ..
awslocal s3 rm s3://todo-app-bucket --recursive
awslocal s3 sync frontend-nextjs/out/ s3://todo-app-bucket/

echo "Deployment complete!"
echo "URL: http://todo-app-bucket.s3.localhost.localstack.cloud:4566/index.html"
```

**CDK スタックでの対処**:

```typescript
// BucketDeploymentをコメントアウトして説明を追加
// new s3deploy.BucketDeployment(this, 'DeployWebsite', {
//   sources: [s3deploy.Source.asset('./frontend-nextjs/out')],
//   destinationBucket: bucket,
// });
// Note: LocalStackでは動作しないため、scripts/deploy-frontend.sh を使用
```

---

### 2. 環境変数の管理

**Lambda 関数**:

```typescript
// ❌ NG: 明示的にエンドポイントを設定
const lambda = new NodejsFunction(this, 'GetTodos', {
  environment: {
    AWS_ENDPOINT_URL: 'http://localhost:4566', // これは不要!
  },
});

// ✅ OK: LocalStackが自動設定
const lambda = new NodejsFunction(this, 'GetTodos', {
  environment: {
    TABLE_NAME: table.tableName,
  },
});
```

**フロントエンド**:

```bash
# .env.local (LocalStack用)
NEXT_PUBLIC_API_URL=https://xxxxx.execute-api.localhost.localstack.cloud:4566/prod/

# .env.production (本番AWS用)
NEXT_PUBLIC_API_URL=https://xxxxx.execute-api.ap-northeast-1.amazonaws.com/prod/
```

---

### 3. テストの調整

**Playwright 設定**:

```typescript
export default defineConfig({
  // LocalStack用の設定
  timeout: 60000, // 本番は 30000
  workers: 1, // 本番は 4-8
  retries: 1, // LocalStackの不安定さに対応

  use: {
    baseURL: 'http://todo-app-bucket.s3.localhost.localstack.cloud:4566',
    actionTimeout: 15000, // 本番は 10000
  },
});
```

---

### 4. ログの確認方法

**Lambda ログ確認**:

```bash
# リアルタイムでログを見る
awslocal logs tail /aws/lambda/getTodos --follow

# エラーだけ抽出
awslocal logs filter-log-events \
  --log-group-name /aws/lambda/getTodos \
  --filter-pattern "ERROR"

# JSON形式で整形
awslocal logs tail /aws/lambda/getTodos --format json | jq
```

---

### 5. デバッグ Tips

**DynamoDB のデータ確認**:

```bash
# 全データ取得
awslocal dynamodb scan --table-name TodoTable

# 特定のIDを取得
awslocal dynamodb get-item \
  --table-name TodoTable \
  --key '{"id": {"S": "uuid-xxx"}}'

# テーブル情報
awslocal dynamodb describe-table --table-name TodoTable
```

**S3 のファイル確認**:

```bash
# バケット一覧
awslocal s3 ls

# バケット内のファイル一覧
awslocal s3 ls s3://todo-app-bucket/

# ファイルダウンロード
awslocal s3 cp s3://todo-app-bucket/index.html ./
```

**API Gateway のエンドポイント確認**:

```bash
# API一覧
awslocal apigateway get-rest-apis

# 特定APIの詳細
awslocal apigateway get-rest-api --rest-api-id xxxxx
```

---

### 6. データの永続化

**デフォルトは揮発性**:

```bash
docker compose down  # ← 全データ消える
```

**永続化する方法**:

```yaml
# docker-compose.yml
services:
  localstack:
    volumes:
      - './localstack-data:/var/lib/localstack' # データ永続化
```

**注意**:

- 無料版は完全な永続化保証なし
- 開発用途なので、データ消失は許容する前提で

---

## まとめ: LT で伝えるべきポイント

### つらみ(正直に話す)

1. **BucketDeployment が動かない**

   - 「本番と同じコードは動きません」
   - 「でも、シェルスクリプトで回避できます」

2. **遅い**

   - 「本番の 3 倍遅いです」
   - 「でも、開発には十分な速度です」

3. **並列処理に弱い**
   - 「負荷テストはできません」
   - 「でも、機能テストには問題なしです」

### 強み(熱く語る)

1. **完全無料**

   - 「AWS アカウント不要、課金ゼロ」
   - 「失敗を恐れず実験できます」

2. **高速イテレーション**

   - 「30 秒でデプロイ、10 秒で削除」
   - 「本番 AWS の 10 倍速い」

3. **学習に最適**
   - 「フロントエンドエンジニアがインフラを学ぶ第一歩に最適」
   - 「チーム全員が同じ環境で開発できる」

### 結論

> LocalStack は完璧ではありません。  
> でも、フロントエンドエンジニアが AWS を学ぶには最高のツールです。  
> 無料で、速く、安全に、CDK の世界に飛び込めます。

**次のステップ**:

1. LocalStack で基礎を学ぶ(今回の Todo アプリ)
2. 慣れたら本番 AWS で小さく試す(無料枠内で)
3. プロダクションへ!(CDK コードはそのまま使える)

---

## 参考リンク

- [LocalStack 公式ドキュメント](https://docs.localstack.cloud/)
- [LocalStack GitHub](https://github.com/localstack/localstack)
- [AWS CDK と LocalStack の統合](https://docs.localstack.cloud/user-guide/integrations/aws-cdk/)
- [LocalStack Pro 機能一覧](https://localstack.cloud/pricing/)
