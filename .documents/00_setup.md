# LoalStack Docker

## 1. localstack コンテナの作成と実行

Docker Compose を使用する場合

```
version: '3.8'

services:
  localstack:
    image: localstack/localstack
    container_name: localstack
    ports:
      - '4566-4599:4566-4599' # AWS service ports
    environment:
      - SERVICES=s3,lambda,dynamodb # 必要なサービスをカンマ区切りで指定
      - DEBUG=1
    networks:
      - localstack_network

networks:
  localstack_network:
    driver: bridge

```

compose を使わないときは

```shell
# あらかじめnetworkを作っておく
docker network create localstack_network

docker run -d \
  --name localstack \
  -p 4566-4599:4566-4599 \
  -e SERVICES=s3,lambda,dynamodb \
  -e DEBUG=1 \
  --network localstack_network \
  localstack/localstack
```

## 2. AWS CLI コンテナの作成と設定

```shell
docker run -it --rm \
  --network localstack_network \
  --name awscli \
  -e AWS_ACCESS_KEY_ID=test \
  -e AWS_SECRET_ACCESS_KEY=test \
  -e AWS_DEFAULT_REGION=us-east-1 \
  amazon/aws-cli \
  --endpoint-url=http://localstack:4566 s3 ls
```

あるいは cli を実行するためのコンテナを作成する

```Dockerfile
FROM amazon/aws-cli

# bashをインストール
RUN yum install -y bash

# workspaceディレクトリを作成
WORKDIR /workspace

# デフォルトのコマンドをbashに変更
ENTRYPOINT ["/bin/bash"]
```

```shell
# ビルド
docker build -t my-aws-cli .

# 実行
docker run -it --rm \
  --network localstack_network \
  --name awscli \
  -e AWS_ACCESS_KEY_ID=test \
  -e AWS_SECRET_ACCESS_KEY=test \
  -e AWS_DEFAULT_REGION=us-east-1 \
  -v "$(pwd)/workspace:/workspace" \
  my-aws-cli
```

いちいち endpoint-url を記述するのが面倒なので、
コンテナにログインしたら

```shell
export AWS_ENDPOINT_URL="http://localstack:4566"
alias aws="aws --endpoint-url=$AWS_ENDPOINT_URL"
```

## 試しに S3 を操作する

リージョンを指定すること。

### バケットの作成

```
docker run -it --rm \
  --network localstack_network \
  -e AWS_ACCESS_KEY_ID=test \
  -e AWS_SECRET_ACCESS_KEY=test \
  -e AWS_DEFAULT_REGION=us-east-1 \
  amazon/aws-cli \
  --endpoint-url=http://localstack:4566 s3 mb s3://my-test-bucket
```

### ファイルをアップロード

```shell
# test.txtを作成
echo "Hello LocalStack!" > test.txt

# ファイルをアップロード
docker run -it --rm \
  --network localstack_network \
  -e AWS_ACCESS_KEY_ID=test \
  -e AWS_SECRET_ACCESS_KEY=test \
  -v "$(pwd)/workspace:/workspace" \
  amazon/aws-cli \
  --endpoint-url=http://localstack:4566 \
  s3 cp /workspace/test.txt s3://my-test-bucket/test.txt
```

### バケット内のオブジェクト一覧を確認：

```
docker run -it --rm \
  --network localstack_network \
  -e AWS_ACCESS_KEY_ID=test \
  -e AWS_SECRET_ACCESS_KEY=test \
  amazon/aws-cli \
  --endpoint-url=http://localstack:4566 \
  s3 ls s3://my-test-bucket
```

### ファイルをダウンロード：

```
docker run -it --rm \
  --network localstack_network \
  -e AWS_ACCESS_KEY_ID=test \
  -e AWS_SECRET_ACCESS_KEY=test \
  -v "$(pwd)/workspace:/workspace" \
  amazon/aws-cli \
  --endpoint-url=http://localstack:4566 \
  s3 cp s3://my-test-bucket/test.txt /workspace/downloaded_test.txt
```

### フォルダ全体をアップロード：

```
docker run -it --rm \
  --network localstack_network \
  -e AWS_ACCESS_KEY_ID=test \
  -e AWS_SECRET_ACCESS_KEY=test \
  -v "$(pwd)/workspace:/workspace" \
  amazon/aws-cli \
  --endpoint-url=http://localstack:4566 \
  s3 cp /workspace/my-folder s3://my-test-bucket/my-folder --recursive
```

## aws cli & aws sam

### SAM

```
docker build -t my-sam-cli . -f ./Dockerfile.sam

docker run -it --rm \
  --network localstack_network \
  -v "$(pwd):/workspace" \
  -e AWS_ACCESS_KEY_ID=test \
  -e AWS_SECRET_ACCESS_KEY=test \
  my-sam-cli
```

```
export SAM_CLI_ENDPOINT_URL="http://localstack:4566"
```

### 余談 jq コマンド

jq は、JSON データを処理・操作するためのコマンドライン ツールです。「JSON Query」の略で、JSON の解析、フィルタリング、変換、整形などを行うことができる非常に強力なツールです。

#### 基本的な使い方

```bash
# JSONを見やすく整形
aws cloudformation describe-stacks | jq '.'

# スタック名のみを抽出
aws cloudformation describe-stacks | jq '.Stacks[0].StackName'

# スタック名とステータスを抽出
aws cloudformation describe-stacks | jq '.Stacks[] | {name: .StackName, status: .StackStatus}'

# S3バケット名一覧を取得
aws s3api list-buckets | jq '.Buckets[].Name'
```
