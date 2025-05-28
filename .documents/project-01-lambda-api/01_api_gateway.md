## API Gateway の作成

> 実行結果を output.txt に出力するには ` > output.txt`のようにリダイレクト演算子を使用する。念の為。

```shell
aws apigateway create-rest-api \
    --name 'LambdaAPI' \
    --description 'API for Lambda function'

{
    "id": "7hqzdtcp4b",
    "name": "LambdaAPI",
    "description": "API for Lambda function",
    "createdDate": "2025-02-17T21:10:05+09:00",
    "apiKeySource": "HEADER",
    "endpointConfiguration": {
        "types": [
            "EDGE"
        ]
    },
    "disableExecuteApiEndpoint": false,
    "rootResourceId": "f83xwiji0w"
}
```

作成された API の ID を取得 （parent-id も含めて）

```shell
aws apigateway get-resources \
    --rest-api-id $(aws apigateway get-rest-apis --query 'items[?name==`LambdaAPI`].id' --output text)

{
    "items": [
        {
            "id": "f83xwiji0w",
            "path": "/"
        }
    ]
}
```

### リソースを作成する。

ID を入力し直すのは面倒なので、変数を設定する。

```shell

# 変数を設定
API_ID=$(aws apigateway get-rest-apis --query 'items[?name==`LambdaAPI`].id' --output text)
## ひとつ目の items[0] が parent-id
PARENT_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query 'items[0].id' --output text)

# リソースを作成
aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $PARENT_ID \
    --path-part 'calc'

{
    "id": "7xnge6ypsv",
    "parentId": "f83xwiji0w",
    "pathPart": "calc",
    "path": "/calc"
}

# 新しく作成したリソースのIDを取得
RESOURCE_ID=$(aws apigateway get-resources \
    --rest-api-id $API_ID \
    --query 'items[?path==`/calc`].id' \
    --output text)

# リソースに対して、POSTメソッドを追加
aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method POST \
    --authorization-type NONE

{
    "httpMethod": "POST",
    "authorizationType": "NONE",
    "apiKeyRequired": false
}

# リソースに対して、Lambda統合を設定
aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method POST \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:000000000000:function:localstack-lambda-url-example/invocations

{
    "type": "AWS_PROXY",
    "httpMethod": "POST",
    "uri": "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:000000000000:function:localstack-lambda-url-example/invocations",
    "passthroughBehavior": "WHEN_NO_MATCH",
    "timeoutInMillis": 29000,
    "cacheNamespace": "7xnge6ypsv",
    "cacheKeyParameters": []
}

# デプロイメントを作成
## 実際にアクセスを可能にする。
aws apigateway create-deployment \
    --rest-api-id $API_ID \
    --stage-name prod

{
    "id": "g7jwtnvhz2",
    "createdDate": "2025-02-17T21:25:25+09:00"
}
```

これで curl コマンドでアクセスできる。

```shell
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"num1": "10", "num2": "10"}' \
  "http://localstack:4566/restapis/$API_ID/prod/_user_request_/calc"

curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"num1": "10", "num2": "10"}' \
  "http://localstack:4566/restapis/7hqzdtcp4b/prod/_user_request_/calc"
```

### API のエンドポイントの一覧を取得

Endpoint は一部固定であることに注意。

```
  echo "Endpoint: https://$api_id.execute-api.us-east-1.amazonaws.com/$stage"
  echo "Endpoint LocalStack: http://localstack:4566/restapis/$api_id/$stage/_user_request_"
```

```shell
(
aws apigateway get-rest-apis --query 'items[*].id' --output text | \
while read -r api_id; do
    echo "API ID: $api_id"

    # APIの基本情報を取得
    api_name=$(aws apigateway get-rest-api --rest-api-id $api_id --query 'name' --output text)
    echo "API Name: $api_name"

    # ステージ一覧を取得
    aws apigateway get-stages --rest-api-id $api_id --query 'item[*].stageName' --output text | \
    while read -r stage; do
        echo "Stage: $stage"
        echo "Endpoint: https://$api_id.execute-api.us-east-1.amazonaws.com/$stage"

        # リソースとメソッドを取得
        aws apigateway get-resources --rest-api-id $api_id --query 'items[*]' | \
        jq -r '.[] | select(.resourceMethods != null) | .path as $path | .resourceMethods | keys[] as $method | "Method: \($method) Path: \($path)"'
    done
    echo "-------------------"
done
) > output.txt



API ID: 7hqzdtcp4b
API Name: LambdaAPI
Stage: prod
Endpoint: https://7hqzdtcp4b.execute-api.us-east-1.amazonaws.com/prod
Method: POST Path: /calc
-------------------
```

## 感想

特に

```shell
# Lambda統合を設定
aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method POST \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:000000000000:function:localstack-lambda-url-example/invocations
```

の --uri の指定が難しい。たいていは IaC で設定するので自分で arn を指定することは無いと思うので気にしなくていいけど。
