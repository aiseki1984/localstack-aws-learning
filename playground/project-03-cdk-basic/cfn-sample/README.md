# CloudFormation テンプレート サンプル

このディレクトリには、CDK と同等の機能を持つ CloudFormation テンプレートが含まれています。

## コード量の比較

### CDK（TypeScript）

- **約 80 行** - `lib/project-03-cdk-basic-stack.ts`
- 高レベルの抽象化
- 依存関係を自動解決
- デフォルト値を自動設定

### CloudFormation（YAML）

- **約 400 行** - `cfn-sample/template.yaml`
- 低レベルの詳細な定義
- 依存関係を明示的に指定（`DependsOn`）
- すべての設定を手動で記述

## 主な違い

### 1. リソース定義の簡潔さ

**CDK**:

```typescript
const postsTable = new dynamodb.Table(this, 'PostsTable', {
  partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
});
```

**CloudFormation**:

```yaml
PostsTable:
  Type: AWS::DynamoDB::Table
  Properties:
    TableName: !Sub '${AWS::StackName}-PostsTable'
    AttributeDefinitions:
      - AttributeName: id
        AttributeType: S
    KeySchema:
      - AttributeName: id
        KeyType: HASH
    BillingMode: PAY_PER_REQUEST
  DeletionPolicy: Delete
  UpdateReplacePolicy: Delete
```

### 2. 権限の自動設定

**CDK**:

```typescript
postsTable.grantReadWriteData(postsFunction); // 1行で完了！
```

**CloudFormation**:

```yaml
PostsFunctionRole:
  Type: AWS::IAM::Role
  Properties:
    # ... 20行以上のポリシー定義
    Policies:
      - PolicyName: DynamoDBAccess
        PolicyDocument:
          Version: '2012-10-17'
          Statement:
            - Effect: Allow
              Action:
                - dynamodb:BatchGetItem
                - dynamodb:BatchWriteItem
                - dynamodb:ConditionCheckItem
                - dynamodb:DeleteItem
                # ... さらに続く
```

### 3. API Gateway の設定

**CDK**:

```typescript
const api = new apigateway.RestApi(this, 'PostsApi', {
  defaultCorsPreflightOptions: {
    allowOrigins: apigateway.Cors.ALL_ORIGINS,
    allowMethods: apigateway.Cors.ALL_METHODS,
  },
});
const posts = api.root.addResource('posts');
posts.addMethod('GET', lambdaIntegration);
posts.addMethod('POST', lambdaIntegration);
```

**CloudFormation**:

- OPTIONS メソッド（CORS 用）を手動定義 × 2
- GET/POST/PUT/DELETE メソッドを個別定義 × 5
- Lambda Permission を個別定義 × 5
- Deployment と DependsOn を明示的に指定
- **合計 100 行以上**

### 4. Lambda と API Gateway の統合

**CDK**:

```typescript
const lambdaIntegration = new apigateway.LambdaIntegration(postsFunction);
posts.addMethod('GET', lambdaIntegration); // 権限も自動設定！
```

**CloudFormation**:

```yaml
# メソッド定義
PostsGetMethod:
  Type: AWS::ApiGateway::Method
  Properties:
    RestApiId: !Ref PostsApi
    ResourceId: !Ref PostsResource
    HttpMethod: GET
    Integration:
      Type: AWS_PROXY
      IntegrationHttpMethod: POST
      Uri: !Sub 'arn:aws:apigateway:${AWS::Region}:lambda:path/...'

# 権限を別途定義
PostsGetPermission:
  Type: AWS::Lambda::Permission
  Properties:
    FunctionName: !Ref PostsFunction
    Action: lambda:InvokeFunction
    Principal: apigateway.amazonaws.com
    SourceArn: !Sub 'arn:aws:execute-api:...'
```

## デプロイ方法

### CloudFormation で直接デプロイ

```bash
# 1. Lambda をビルド
cd ../lambda
npm run build
cd ../cfn-sample

# 2. Lambda コードを ZIP 化
cd ../lambda/dist
zip -r lambda.zip .
mv lambda.zip ../../cfn-sample/

# 3. S3 バケット作成
aws s3 mb s3://cdk-lambda-deployment-bucket \
  --endpoint-url=http://localstack:4566 \
  --region=ap-northeast-1

# 4. Lambda コードをアップロード
aws s3 cp lambda.zip s3://cdk-lambda-deployment-bucket/ \
  --endpoint-url=http://localstack:4566 \
  --region=ap-northeast-1

# 5. スタックをデプロイ
aws cloudformation deploy \
  --stack-name PostsApiStack \
  --template-file template.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --endpoint-url=http://localstack:4566 \
  --region=ap-northeast-1
```

## まとめ

| 項目          | CDK                    | CloudFormation      |
| ------------- | ---------------------- | ------------------- |
| コード量      | 約 80 行               | 約 400 行           |
| 抽象度        | 高い                   | 低い                |
| 権限設定      | 自動                   | 手動                |
| 依存関係      | 自動解決               | 明示的に指定        |
| Lambda ビルド | 自動（NodejsFunction） | 手動                |
| 学習曲線      | TypeScript の知識      | YAML + AWS 詳細知識 |
| 保守性        | 高い                   | 低い                |

**CDK の価値**: 5 倍のコード削減 + 自動化 + 型安全性 🚀
