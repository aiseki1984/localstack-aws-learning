# LocalStack AWS Learning

LocalStack を使って、ローカル環境で AWS サービスの学習を行うためのリポジトリです。

https://www.localstack.cloud/

## 概要

LocalStack を使って、端末内だけで AWS の学習をしたい

## 特徴

- Windows/Mac 両対応のマルチプラットフォーム構成
- AWS CLI v2 が自動でアーキテクチャに応じてインストール
- LocalStack 用のエイリアス設定済み

## プロジェクト一覧

### Project-01: AWS CLI 基礎

- IAM、S3、Lambda、API Gateway の基本操作
- AWS CLI コマンドによる手動リソース管理

### Project-02: Terraform IaC

- Terraform を使った Infrastructure as Code
- Lambda + API Gateway の自動化構築
- 詳細なリソース制御と Terraform 状態管理

### Project-03: SAM サーバーレス

- AWS SAM (Serverless Application Model)
- サーバーレス特化の効率的な開発
- ローカル開発環境とワンコマンドデプロイ

## 使い方

devcontainer を使って、 `localstack_client` サービスにアタッチしてください。
そうでなければ、以下の手順でアタッチしてください。

### docker compose

```shell
$ docker compose up -d
$ docker compose exec localstack_client bash
```

## 参考

- [\[AWS\] LocalStack でローカルに AWS 開発環境を構築する](https://zenn.dev/third_tech/articles/602e97a68f3370)
- [LocalStack をつかってローカル環境で AWS サービスにアクセスしてみた](https://www.skyarch.net/blog/localstack%E3%82%92%E3%81%A4%E3%81%8B%E3%81%A3%E3%81%A6%E3%83%AD%E3%83%BC%E3%82%AB%E3%83%AB%E7%92%B0%E5%A2%83%E3%81%A7aws%E3%82%B5%E3%83%BC%E3%83%93%E3%82%B9%E3%81%AB%E3%82%A2%E3%82%AF%E3%82%BB/)
- [localstack をもっと使いましょうという話](https://zenn.dev/yunbopiao/articles/10a8b37a8d6464)
- [AWS 開発環境｜ LocalStack をさわってみた。](https://aws.taf-jp.com/blog/78562)
- [AWS CDK+localstack を使ってよくある REST な Web アプリ構成を作ってみる](https://zenn.dev/okojomoeko/articles/f4458e1efc8f7a)
