```sh
sam --version

sam build
sam deploy
```

## リソースの確認

```sh
# stackの確認
aws cloudformation describe-stacks --stack-name chapter05-stack
aws cloudformation describe-stacks --stack-name chapter05-stack | jq '.Stacks[] | {name: .StackName, status: .StackStatus, created_at: .CreationTime }'

aws sqs list-queues

{
    "QueueUrls": [
        "http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/chapter05-queue"
    ]
}

aws s3 ls

2025-10-26 00:54:42 aws-sam-cli-managed-default-samclisourcebucket-9d6cbe01
2025-10-26 00:54:57 chapter05-bucket
```

SAM が自動で作ったスタック `aws-sam-cli-managed-default` や S3 の `aws-sam-cli-managed-default-samclisourcebucket-9d6cbe01` などがあることに注意。削除したかったら削除すること。

### sam list

```
sam list endpoints
sam list resources
```

## サーバレスアプリケーションを動かす

SQS にメッセージを送ったら、登録時それをトリガーに、自動的に AWS Lambda 関数が実行され、最終的に S3 に保存されるはず。

```shell
$ aws sqs send-message \
    --queue-url http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/chapter05-queue \
    --message-body '{ "id": "id0003", "body": "This is message 0003." }'

$ aws s3 ls chapter05-bucket
```

ちなみに、以下のように適当なフォーマットで send-message をしても、lambda は処理してくれなかった。

```sh
aws sqs send-message \
    --queue-url http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/chapter05-queue \
    --message-body '{ "message": "適当なメッセージです。" }'
```

## クリーンアップ

```sh
sam delete
```
