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

## バージョン管理オブジェクトの削除

バージョン管理が有効な S3 バケットでは、オブジェクトを削除しても **削除マーカー** が作成されるだけで、実際のデータは残存します。これにより「見た目上は空」でも「実際は空でない」状態になり、バケット削除時にエラーが発生します。

### バージョン管理状況の確認

```shell
# バケット内の現在のオブジェクト確認（削除済みは表示されない）
aws s3 ls s3://bucket-name --recursive

# バージョン管理情報を含む全オブジェクト確認
aws s3api list-object-versions --bucket bucket-name
```

### バージョン管理オブジェクトの完全削除

```shell
# 1. 全バージョンのオブジェクトを削除
aws s3api delete-objects --bucket bucket-name --delete "$(aws s3api list-object-versions --bucket bucket-name --query '{Objects: Versions[].{Key:Key,VersionId:VersionId}}')"

# 2. 削除マーカーを削除
aws s3api delete-objects --bucket bucket-name --delete "$(aws s3api list-object-versions --bucket bucket-name --query '{Objects: DeleteMarkers[].{Key:Key,VersionId:VersionId}}')"

# 3. バケットを削除
aws s3 rb s3://bucket-name
```

### 一括削除（ワンライナー）

```shell
# バージョン管理バケットの完全削除
aws s3api delete-objects --bucket BUCKET_NAME --delete "$(aws s3api list-object-versions --bucket BUCKET_NAME --query '{Objects: [Versions[].{Key:Key,VersionId:VersionId}, DeleteMarkers[].{Key:Key,VersionId:VersionId}][]}')" && aws s3 rb s3://BUCKET_NAME
```

### 💡 **重要なポイント**

- **通常削除**: 削除マーカーが作成されるだけ（データは残存）
- **完全削除**: バージョン + 削除マーカーの両方を削除
- **SAM 管理バケット**: 自動的にバージョン管理が有効になる
- **コスト注意**: 削除してもデータが残るため課金継続
