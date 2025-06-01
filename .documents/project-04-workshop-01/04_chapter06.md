## Chapter06 使い捨ての LocalStack で単体テストを実行しよう

デプロイする前に単体テストを実行する。
Pytest と LocalStack を組み合わせる。

### localstack-utils

LocalStack が提供する localstack-utils を使って、単体テスト実行時に使い捨て可能な LocalStack を起動する
https://docs.localstack.cloud/user-guide/tools/testing-utils/

### 単体テストを実行する

作業ディレクトリを作成し、workshop の git リポジトリから、chapter06 をコピーする。
us-east-1 で作業していたので、ap-northeast-1 から us-east-1 に変更しておく。

```shell
pip install -r tests/requirements-test.txt
```

```shell
ENV=test python3 -m pytest -p no:warnings --verbose
```

### /var/run/docker.sock

テストを実行するとエラーが発生する。

```
docker.errors.DockerException: Error while fetching server API version: ('Connection aborted.', FileNotFoundError(2, 'No such file or directory'))
```

devcontainer 上で pytest を実行し、 localstack-utils を使うとエラーが発生する。
これは localstac_client コンテナ内で Docker デーモンが動いておらず、`/var/run/docker.sock` も存在しないから。
コンテナの外で実行するといいが、今は python を導入するのは面倒くさいので、一旦 localstack_utils の記述をコメントアウトする。

こうすると、`使い捨て可能なLocalStack`が使えなくなるので、CI 環境でテストができないことに注意。

### サーバレスアプリケーションをデプロイする

localstack-utils が使えないので、アプリケーションをデプロイしてから、テストが時効できるようになる。

```shell
$ sam build
$ sam deploy
```

#### 確認

```shell
$ aws sqs list-queues
{
    "QueueUrls": [
      ...
        "http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/chapter06-queue"
    ]
}
$ aws s3 ls
2025-06-01 23:58:04 aws-sam-cli-managed-default-samclisourcebucket-59be2136
2025-06-02 00:01:26 chapter06-bucket

$ aws s3 ls s3://chapter06-bucket
```

```shell
$ aws sqs send-message \
    --queue-url http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/chapter06-queue \
    --message-body '{ "id": "id0004", "body": "This is message 0004." }'


# 確認
$ aws s3 ls s3://chapter06-bucket/
PRE chapter06/
$ aws s3 ls s3://chapter06-bucket/chapter06/
2025-06-02 00:19:59         49 id0007.json
$ aws s3 ls s3://chapter06-bucket/ --recursive
2025-06-02 00:19:59         49 chapter06/id0007.json
2025-06-02 00:17:09         49 id0004.json
2025-06-02 00:18:37         49 id0005.json
2025-06-02 00:19:12         49 id0006.json
```
