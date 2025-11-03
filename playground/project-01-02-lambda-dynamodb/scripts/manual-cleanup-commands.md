# 手動クリーンアップコマンド集

# 環境変数設定

export AWS_ENDPOINT_URL=http://localstack:4566
export AWS_REGION=us-east-1

# 1. Lambda 関数の削除

aws lambda delete-function \
 --function-name lambda-dynamodb-demo \
 --endpoint-url=$AWS_ENDPOINT_URL \
 --region $AWS_REGION

# 2. DynamoDB テーブルの削除

aws dynamodb delete-table \
 --table-name users \
 --endpoint-url=$AWS_ENDPOINT_URL \
 --region $AWS_REGION

# 3. IAM ロールの削除

aws iam delete-role \
 --role-name lambda-execution-role \
 --endpoint-url=$AWS_ENDPOINT_URL \
 --region $AWS_REGION

# 4. ローカルファイルの削除

rm -f lambda/function.zip
rm -f lambda/post_response.json
rm -f lambda/get_response.json
rm -rf lambda/dist/
