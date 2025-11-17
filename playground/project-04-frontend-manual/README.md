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
awslocal s3api put-public-access-block \
  --bucket sample-bucket \
  --public-access-block-configuration \
  "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

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

## クリーンアップ

```bash
# 1. S3バケット内のオブジェクトをすべて削除
awslocal s3 rm s3://sample-bucket --recursive

# 2. S3バケットを削除
awslocal s3 rb s3://sample-bucket
```

## 参考

- [LocalStack を使用して、ローカル環境で S3 を利用した静的ウェブページのホスティング手順](https://qiita.com/tsuno0821/items/248cfa05566d03619345)
- [https://qiita.com/y_inoue15/items/c637dd2e269f7ab50e38](https://qiita.com/y_inoue15/items/c637dd2e269f7ab50e38)

### S3

- **BlockPublicAcls**: `false`
  - パブリックアクセスを許可する新しい ACL（Access Control List）の設定をブロックするかどうか
  - `false` = 新しいパブリック ACL の設定を許可
- **IgnorePublicAcls**: `false`
  - 既存のパブリック ACL を無視するかどうか
  - `false` = 既存のパブリック ACL を有効にする
- **BlockPublicPolicy**: `false`
  - パブリックアクセスを許可するバケットポリシーの設定をブロックするかどうか
  - `false` = パブリックアクセスを許可するバケットポリシーを設定可能
- **RestrictPublicBuckets**: `false`
  - パブリックポリシーが設定されたバケットへのクロスアカウントアクセスを制限するかどうか
  - `false` = クロスアカウントアクセスを許可

## Nextjs

Nextjs を静的サイトとしてデプロイする。
[How to create a static export of your Next.js application](https://nextjs.org/docs/app/guides/static-exports)

```bash
npx create-next-app@latest frontend-nextjs --yes

# next.config.ts で
# output: 'export',
# にしておく
```

s3

```bash
# S3にアップロード
awslocal s3 sync ./frontend-nextjs/out s3://sample-bucket
```

http://sample-bucket.s3.localhost.localhost.localstack.cloud:4566/index.html
