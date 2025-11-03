# Project-01-02: Lambda(Typescript) + DynamoDB

まず Lambda 関数を Typescript で作成できるようにする。どのようなディレクトリ構成が一般的なのか確認しておきたい。

## 概要

AWS CLI を使用して Lambda 関数と DynamoDB を手動で構築・連携させる学習プロジェクトです。LocalStack 環境を使用することで、実際の AWS 環境を使わずに安全に学習できます。

## lambda

```sh
cd lambda/
```

### 操作

```sh
npm install -D vitest
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

## 参考

- [TypeScript による Lambda 関数の作成](https://docs.aws.amazon.com/ja_jp/lambda/latest/dg/lambda-typescript.html)
- [Typescript 開発である自分が AWS Lambda を開発するにあたって知っておきたかったこと](https://zenn.dev/hiroto_fp/articles/32d358d6dad9ae)
