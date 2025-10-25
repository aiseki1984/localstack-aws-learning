## Chapter 03 Python コードで Amazon SQS と Amazon S3 を操作しよう

### Amazon SQS キューと Amazon S3 バケットをデプロイする

```shell
$ aws sqs create-queue \
    --queue-name chapter03-queue-03 \
    --attributes ReceiveMessageWaitTimeSeconds=20

{
    "QueueUrl": "http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/chapter03-queue-03"
}

$ aws s3api create-bucket \
    --bucket chapter03-bucket \
    --create-bucket-configuration LocationConstraint=us-east-1
An error occurred (InvalidLocationConstraint) when calling the CreateBucket operation: The specified location-constraint is not valid

$ aws s3api create-bucket \
    --bucket chapter03-bucket

{
    "Location": "/chapter03-bucket"
}
```

### `aws s3` と `aws s3api` の違い

aws s3 と aws s3api の違いは、抽象度と使いやすさにあります。

#### ✅ aws s3

- 高レベル（ハイレベル）コマンド
- よく使う操作（ファイルのアップロード、ダウンロード、同期など）を簡単に使えるようにしたコマンド
- 内部では s3api を呼び出していますが、ユーザーにとって扱いやすい形式です

主な用途

```shell
aws s3 cp ./file.txt s3://my-bucket/
aws s3 sync ./local-folder/ s3://my-bucket/
aws s3 ls s3://my-bucket/
```

特徴:

- 簡単で直感的
- ファイル操作が中心
- cp, sync, mv, rm, ls など

#### ✅ aws s3api

- 低レベル（ローレベル）コマンド
- AWS S3 API をほぼそのままラップしたもの
- より細かい設定や制御が可能（バケットポリシー設定、暗号化設定、バージョン管理など）

```shell
aws s3api create-bucket --bucket my-bucket --region ap-northeast-1
aws s3api put-bucket-policy --bucket my-bucket --policy file://policy.json
aws s3api get-object --bucket my-bucket --key file.txt --output file.txt
```

特徴:

- 細かい制御が可能
- 全ての API アクションにアクセス可能
- よく使うのは create-bucket, put-bucket-policy, get-object, list-objects-v2 など

### Amazon SQS キューにメッセージを登録する

```shell
$ aws sqs send-message \
    --queue-url http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/chapter03-queue-03 \
    --message-body '{ "id": "id0001", "body": "This is message 0001." }'

{
    "MD5OfMessageBody": "724a181067bbde5b905d391a475a82ec",
    "MessageId": "0382c25a-ff7a-404b-97cb-e402b7089b0a"
}

$ aws sqs send-message \
    --queue-url http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/chapter03-queue-03 \
    --message-body '{ "id": "id0002", "body": "This is message 0002." }'

{
    "MD5OfMessageBody": "b796b47a6c737f200e34c2676dc40a2a",
    "MessageId": "8762c9ca-8536-4c38-ba5b-a16312341595"
}

$ aws sqs list-queues
{
    "QueueUrls": [
        "http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/chapter02-queue",
        "http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/chapter02-queue-awslocal",
        "http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/chapter03-queue-03"
    ]
}

# queを受信する
$ aws sqs receive-message \
    --queue-url http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/chapter03-queue-03


$ aws sqs receive-message \
  --queue-url http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/chapter03-queue-03 \
  --max-number-of-messages 10 \
  --visibility-timeout 0 \
  --wait-time-seconds 0

# メッセージを一覧だけしたい（他のクライアントから見えるようにしたい）とき
# --visibility-timeout 0
# これを指定しないと、デフォルトで30秒他のクライアントからは見えなくなる。

```

### Python コードで操作する

python で SQS メッセージを s3 に保存する。

```shell
$ pip freeze | grep boto3
boto3==1.38.24
$ python3 src/app.py

# s3に保存されたか確認
$ aws s3 ls s3://chapter03-bucket
2025-06-01 18:17:19         51 id0001.json
2025-06-01 18:17:19         51 id0002.json
# syncでlocalのフォルダに同期してみる
# aws s3 sync <同期元> <同期先>
$ aws s3 sync s3://chapter03-bucket/ ./local-folder

# キューの内容を見てみる
# 処理したので、何もないはず。
$ aws sqs receive-message \
  --queue-url http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/chapter03-queue-03 \
  --max-number-of-messages 10 \
  --visibility-timeout 0 \
  --wait-time-seconds 0
```
