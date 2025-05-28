# LocalStack でawsの 学習

https://www.localstack.cloud/

LocalStack を使って、端末内だけで AWS の学習をしたい

## usage

```shell
$ docker compose -f docker-compose.yml up -d
$ docker compose exec localstack_client bash
```


## 参考

- [\[AWS\] LocalStack でローカルに AWS 開発環境を構築する](https://zenn.dev/third_tech/articles/602e97a68f3370)
- [LocalStack をつかってローカル環境で AWS サービスにアクセスしてみた](https://www.skyarch.net/blog/localstack%E3%82%92%E3%81%A4%E3%81%8B%E3%81%A3%E3%81%A6%E3%83%AD%E3%83%BC%E3%82%AB%E3%83%AB%E7%92%B0%E5%A2%83%E3%81%A7aws%E3%82%B5%E3%83%BC%E3%83%93%E3%82%B9%E3%81%AB%E3%82%A2%E3%82%AF%E3%82%BB/)
- [localstack をもっと使いましょうという話](https://zenn.dev/yunbopiao/articles/10a8b37a8d6464)
- [AWS 開発環境｜ LocalStack をさわってみた。](https://aws.taf-jp.com/blog/78562)
- [AWS CDK+localstack を使ってよくある REST な Web アプリ構成を作ってみる](https://zenn.dev/okojomoeko/articles/f4458e1efc8f7a)
