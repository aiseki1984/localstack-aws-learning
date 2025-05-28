# Lamnbda + API Gateway

cli で lambda と api gateway を設定する。

## 参考

- https://docs.localstack.cloud/user-guide/aws/lambda/
- https://docs.localstack.cloud/user-guide/aws/apigateway/

## Lambda 関数の作成

```index.js
exports.handler = async (event) => {
    let body = JSON.parse(event.body)
    const product = body.num1 * body.num2;
    const response = {
        statusCode: 200,
        body: "The product of " + body.num1 + " and " + body.num2 + " is " + product,
    };
    return response;
};
```

zip にまとめて、Lambda 関数を作成する

```bash
zip function.zip index.js
aws lambda create-function \
    --function-name localstack-lambda-url-example \
    --runtime nodejs18.x \
    --zip-file fileb://function.zip \
    --handler index.handler \
    --role arn:aws:iam::000000000000:role/lambda-role
```

```bash
# 作成した関数の確認
aws lambda list-functions
aws lambda get-function --function-name xxxxxxx
aws lambda get-function --function-name localstack-lambda-url-example

# lambda関数urlの確認
aws lambda list-function-url-configs --function-name xxxxxxx
aws lambda list-function-url-configs --function-name localstack-lambda-url-example
```

invoke で実行してみる

```bash
# AWS CLI v2
aws lambda invoke --function-name localstack-lambda-url-example \
    --cli-binary-format raw-in-base64-out \
    --payload '{"body": "{\"num1\": \"10\", \"num2\": \"10\"}" }' output.txt
```

### Lambda 関数 URL の作成

`create-function-url-config` で作成する。GUI の LocalStack Desktop では確認出来ないので注意。

```bash
aws lambda create-function-url-config \
    --function-name localstack-lambda-url-example \
    --auth-type NONE


# lambda関数urlの確認
aws lambda list-function-url-configs --function-name xxxxxxx
aws lambda list-function-url-configs --function-name localstack-lambda-url-example

{
    "FunctionUrl": "http://lzojxxojdif8qgyaoenadso5asyh53zo.lambda-url.us-east-1.localhost.localstack.cloud:4566/",
    "FunctionArn": "arn:aws:lambda:us-east-1:000000000000:function:localstack-lambda-url-example",
    "AuthType": "NONE",
    "CreationTime": "2025-02-17T11:36:41.300681+0000"
}

```

また、cli では、function-url を一度に一覧表示するコマンドは無いことにも注意。個々の Lambda 関数に紐づいているので。
list-functions 経由で制御構文を使って取得することもできる。

```bash
# すべてのLambda関数を取得
aws lambda list-functions --query 'Functions[*].FunctionName' --output text | \
while read -r function_name; do
    echo "Checking Function URLs for: $function_name"
    aws lambda list-function-url-configs --function-name "$function_name"
done > output.txt

# すべてのLambda関数を取得。json形式で。
aws lambda list-functions --query 'Functions[*].FunctionName' --output text | \
while read -r function_name; do
    echo "{\"functionName\": \"$function_name\", \"urls\": "
    aws lambda list-function-url-configs --function-name "$function_name" --output json
    echo "}"
done | jq -s '.' > function_urls.json
```

作成した Lambda 関数の URL をトリガーする

```bash
curl -X POST \
    'http://<XXXXXXXX>.lambda-url.us-east-1.localhost.localstack.cloud:4566/' \
    -H 'Content-Type: application/json' \
    -d '{"num1": "10", "num2": "10"}'

curl -X POST \
    'http://lzojxxojdif8qgyaoenadso5asyh53zo.lambda-url.us-east-1.localhost.localstack.cloud:4566/' \
    -H 'Content-Type: application/json' \
    -d '{"num1": "10", "num2": "10"}'

The product of 10 and 10 is 100
```

ただ、コンテナ内の CLI で実行すると `*.localhost.localstack.cloud` のドメインを解決できないので、コンテナの外で実行する。

今回は関数 URL は使わないので削除する。

```
aws lambda delete-function-url-config \
    --function-name localstack-lambda-url-example
```
