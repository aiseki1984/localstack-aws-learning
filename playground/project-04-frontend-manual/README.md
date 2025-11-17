# S3 に vite-react プロジェクトをホスティングする

手動で S3 のバケットを作り、frontend でビルドしたものをアップロードする。

## 手順

フロントエンドの作成・ビルド

```bash
mkdir frontend
cd frontend
npm create vite@latest . -- --template react-ts
npm run build
```

dist に index.html, vite.svg, assets が出力された。

s3

```bash
# 1. S3バケットを作成する。
awslocal s3 mb s3://sample-bucket
awslocal s3 ls sample-bucket

# 2. 作成したバケットをパブリックアクセスを可能にする
awslocal s3api put-public-access-block --bucket sample-bucket --public-access-block-configuration  "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

# 3. 作成したバケットのバケットポリシーの設定
touch bucket-policy.json

{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "*"
        }
    ]
}

# S3バケットにバケットポリシーを設定する
awslocal s3api put-bucket-policy --bucket sample-bucket --policy file://bucket-policy.json

# 4. reactアプリで実装したReactの資材をS3にアップロード
awslocal s3 sync ./frontend/dist s3://sample-bucket
```

http://sample-bucket.s3.localhost.localhost.localstack.cloud:4566/index.html

## 参考

- [LocalStack を使用して、ローカル環境で S3 を利用した静的ウェブページのホスティング手順](https://qiita.com/tsuno0821/items/248cfa05566d03619345)
