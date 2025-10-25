# S3 の操作

## バケットの作成

```shell
aws s3 mb s3://my-test-bucket

## バケットの確認
aws s3 ls
```

## ファイルをアップロード

```shell
# test.txtを作成
echo 'Hello LocalStack!' > test.txt
aws s3 cp ./workspace/test.txt s3://my-test-bucket/test.txt
```

## バケット内のオブジェクト一覧を確認

```shell
aws s3 ls s3://my-test-bucket
```

## ファイルをダウンロード

```shell
aws s3 cp s3://my-test-bucket/test.txt ./workspace/downloaded_test.txt
```

## フォルダ全体をアップロード

```shell
aws s3 cp ./workspace/my-folder s3://my-test-bucket/my-folder --recursive
```

## その他の便利なコマンド

```
# バケットの削除
s3 rb s3://my-test-bucket

# オブジェクトの削除
s3 rm s3://my-test-bucket/test.txt

# バケット内のすべてのオブジェクトを削除
s3 rm s3://my-test-bucket --recursive
```
