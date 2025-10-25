# LocalStack 実践入門 | AWS アプリケーション開発ワークショップ の学習

LocalStack 実践入門 | AWS アプリケーション開発ワークショップ  
https://zenn.dev/kakakakakku/books/aws-application-workshop-using-localstack

## ⭐️ 登場する AWS サービス（順不同）

- Amazon SQS
- Amazon S3
- AWS CloudFormation
- AWS SAM
- AWS Lambda
- Amazon CloudWatch Logs
- Amazon API Gateway

## Chapter 02 Amazon SQS キューをデプロイする

https://zenn.dev/kakakakakku/books/aws-application-workshop-using-localstack/viewer/02-hello-localstack

```shell
$ aws sqs create-queue \
    --queue-name chapter02-queue \
    --attributes ReceiveMessageWaitTimeSeconds=20
{
    "QueueUrl": "http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/chapter02-queue"
}

$ aws sqs create-queue \
    --queue-name chapter02-queue-awslocal \
    --attributes ReceiveMessageWaitTimeSeconds=20
{
    "QueueUrl": "http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/chapter02-queue-awslocal"
}
```

```bash
# SQS リソースを確認
aws sqs list-queues
# キューを作成
aws sqs create-queue --queue-name my-queue
# キューの URL を取得
aws sqs get-queue-url --queue-name my-queue
# キューを削除
aws sqs delete-queue --queue-url <QUEUE_URL>
```
