# awslocal

LocalStack を使うときに、　 aws コマンド にいちいち`--endpoint-url http://localhost:4566 --profile localstack` 等のオプションを付けるのは面倒なときに使う。

```bash
$ brew install awscli-local
$ awslocal --version

# CDK Local
$ npm install -g aws-cdk-local aws-cdk
$ npm list -g

# nodenv を使用しているので、グローバルパッケージをインストールしたら、
# rehash を実行して、 shim を更新する。
$ nodenv rehash

$ cdklocal --version

```

## 使い方

```bash
$ awslocal s3 mb s3://my-test-bucket
$ awslocal s3 ls
```

```bash
$ cdklocal init app --language typescript
```
