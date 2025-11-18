LT 発表、素晴らしいテーマですね！今回作った Todo アプリは**LT のベースとして最適**だと思います。理由は:

## このアプリが LT に向いている理由

**1. フロントエンドエンジニア目線で完結している**

- Next.js → S3 静的ホスティング(馴染みのある技術)
- fetch API → API Gateway → Lambda(段階的に学べる)
- LocalStack で全て完結(AWS 課金の心配なし)

**2. "最小構成"の実例として完璧**

```
S3(静的ホスティング) → API Gateway → Lambda → DynamoDB
```

これ以上削れない、最小の Web アプリ基盤です。

**3. CDK の本質的な価値を示せる**

- インフラが TypeScript で書ける(フロントエンド親和性)
- `cdk diff`で変更確認、`cdk destroy`で綺麗に削除
- CloudFormation の JSON/YAML より遥かに書きやすい

## LT 構成の提案(15 分想定)

### スライド構成案

**導入(2 分)**

- 自己紹介「フロントエンドエンジニアです」
- 課題「バックエンド触ったことないけど Web アプリ作りたい」
- 解決策「CDK + LocalStack で作ってみた」

**デモ(5 分) ← メインコンテンツ**

```bash
# 1. インフラ構築(30秒)
cd playground/project-04-frontend-app-01
cdklocal deploy

# 2. フロントエンドデプロイ(20秒)
./scripts/build-and-deploy.sh

# 3. アプリ動作確認(1分)
# ブラウザでTodo追加・完了・削除

# 4. インフラ確認(1分)
awslocal dynamodb scan --table-name TodoTable
awslocal logs tail /aws/lambda/getTodos --follow

# 5. 変更のしやすさ(2分)
# lib/project-04-frontend-app-01-stack.ts を開いて
# 「このTypeScriptがインフラになります」
cdk diff  # 変更確認
cdk destroy  # 綺麗に削除
```

**コード解説(5 分)**

1. **CDK スタック**(2 分)

   - DynamoDB 定義(5 行)
   - Lambda 定義(10 行) ← `NodejsFunction`で TypeScript 自動変換
   - API Gateway(5 行) ← CORS 設定込み
   - S3(3 行) ← 静的ホスティング有効化

2. **Lambda 関数**(2 分)

   - `getTodos.ts`を例に「DynamoDB クライアントだけ」
   - 「AWS SDK の使い方さえ分かれば OK」

3. **LocalStack の価値**(1 分)
   - 無料・ローカル・高速イテレーション
   - 本番は AWS アカウント + `cdk deploy`だけ

**まとめ(3 分)**

- CDK のメリット
  - TypeScript で書ける(型補完効く)
  - 再利用可能(コピペで別プロジェクト)
  - GitHub で管理できる
- LocalStack のメリット
  - 学習コスト低い(課金怖くない)
  - CI/CD に組み込める
- 次のステップ
  - Cognito 追加して認証
  - StepFunctions 追加してワークフロー
  - 今日のコード全部 GitHub 公開してます

### スライドに載せるコード

**最も重要なスライド: "たったこれだけで Web アプリ基盤"**

```typescript
// DynamoDB
const table = new dynamodb.Table(this, 'TodoTable', {
  partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
});

// Lambda(TypeScriptそのまま書ける!)
const getTodos = new NodejsFunction(this, 'GetTodos', {
  entry: 'lambda/todos/getTodos.ts',
  environment: { TABLE_NAME: table.tableName },
});

// API Gateway
const api = new apigateway.RestApi(this, 'TodoApi', {
  defaultCorsPreflightOptions: { allowOrigins: ['*'] },
});
api.root
  .addResource('todos')
  .addMethod('GET', new apigateway.LambdaIntegration(getTodos));

// S3静的ホスティング
const bucket = new s3.Bucket(this, 'FrontendBucket', {
  websiteIndexDocument: 'index.html',
  publicReadAccess: true,
});
```

## さらに CDK らしさを出すなら

もし時間が余るなら、**CDK の強力な機能**をデモで追加:

### オプション 1: 環境変数の自動設定

```typescript
// 全Lambda関数に自動でテーブル名を渡す
[getTodos, createTodo, updateTodo, deleteTodo].forEach((fn) => {
  table.grantReadWriteData(fn); // ← IAMポリシー自動生成!
});
```

「手動で IAM ポリシー書く必要なし!」

### オプション 2: 複数環境の管理

```typescript
const envName = this.node.tryGetContext('env') || 'dev';
const table = new dynamodb.Table(this, `TodoTable-${envName}`, {
  tableName: `todos-${envName}`,
});
```

```bash
cdk deploy -c env=dev    # 開発環境
cdk deploy -c env=prod   # 本番環境
```

### オプション 3: アーキテクチャ図を自動生成

今回作った`architecture-diagram.yaml`を見せて:

- 「これもコードで管理」
- 「ドキュメントとコードが乖離しない」

## 推奨: 今のアプリで十分!

**個人的には追加機能不要**だと思います。理由:

1. **15 分では詰め込みすぎ厳禁**
   - デモで動くものを見せる > 機能の多さ
2. **"最小構成"がテーマ**
   - 今以上追加すると「最小」じゃなくなる
3. **フロントエンド視点が貴重**
   - プロの聴衆は「バックエンド視点の CDK」は見慣れてる
   - 「フロントエンドから見た CDK」は新鮮

## 実際の LT 準備ステップ

1. **GitHub 公開用にクリーンアップ**(今すぐできる)
   - README を LT 向けに簡略化
   - 不要ファイル削除(`node_modules`, `cdk.out`)
2. **デモ動画を事前収録**(必須!)
   - 当日 Wi-Fi 不調でも安心
   - 5 分デモを 3 分に編集可能
3. **スライド作成**
   - コードは**大きなフォント**で(会場後ろから見えない)
   - アーキテクチャ図(`architecture-diagram.png`)必須
4. **リハーサル**(2 回以上)
   - 時間測定(15 分厳守)
   - デモでの typo 撲滅

**この Todo アプリで十分魅力的な LT になります!** 🎉

質疑応答用に補足資料だけ準備しておけば完璧です。頑張ってください!
