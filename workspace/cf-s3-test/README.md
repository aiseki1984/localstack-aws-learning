# CloudFormation S3 バケット削除テスト

## 概要

CloudFormation で作成した S3 バケットの削除動作を検証するハンズオンです。
特に「空でないバケット」が CloudFormation スタック削除時にどのように動作するかを確認します。

## 学習目標

- CloudFormation で S3 バケットを作成・削除する方法
- 空でない S3 バケットの削除制限を理解する
- 本番 AWS vs LocalStack の動作の違いを知る
- バージョン管理有効バケットの削除手順を習得する

## 前提条件

- AWS CLI 設定済み（LocalStack 環境）
- CloudFormation 基本知識
- S3 基本操作の理解

## ハンズオン手順

### 1. CloudFormation テンプレートで S3 バケット作成

```bash
# プロジェクトディレクトリに移動
cd /workspaces/localstack-aws-learning/workspace/cf-s3-test

# CloudFormationスタックをデプロイ
aws cloudformation deploy --stack-name s3-test-stack --template-file template.yaml
```

### 2. 作成されたバケットを確認

```bash
# S3バケット一覧を確認
aws s3 ls | grep cf-test

# バケットの詳細情報を確認
aws cloudformation describe-stacks --stack-name s3-test-stack
```

### 3. バケットにオブジェクトをアップロード

```bash
# テストファイルをバケットにアップロード
echo "Test file content" | aws s3 cp - s3://cf-test-bucket-versioned/test-file.txt

# アップロードされたファイルを確認
aws s3 ls s3://cf-test-bucket-versioned
```

### 4. 空でないバケットでスタック削除を試行

```bash
# CloudFormationスタックを削除（バケットが空でない状態）
aws cloudformation delete-stack --stack-name s3-test-stack

# 削除状況を確認
aws cloudformation describe-stacks --stack-name s3-test-stack 2>/dev/null || echo "スタックは削除されました"

# バケットが実際に削除されたか確認
aws s3 ls | grep cf-test || echo "バケットも削除されました"
```

## 期待される結果

### LocalStack 環境

- スタック削除成功
- バケットも削除される場合がある（開発環境の緩い制限）

### 本番 AWS 環境

- スタック削除失敗
- `BucketNotEmpty` エラーが発生
- スタック削除がロールバックされる

## 本番環境での正しい削除手順

### 方法 1: 手動でバケットを空にしてから削除

```bash
# 1. 通常オブジェクトを削除
aws s3 rm s3://cf-test-bucket-versioned --recursive

# 2. バージョン管理オブジェクトを削除
aws s3api delete-objects --bucket cf-test-bucket-versioned --delete "$(aws s3api list-object-versions --bucket cf-test-bucket-versioned --query '{Objects: Versions[].{Key:Key,VersionId:VersionId}}')"

# 3. 削除マーカーを削除
aws s3api delete-objects --bucket cf-test-bucket-versioned --delete "$(aws s3api list-object-versions --bucket cf-test-bucket-versioned --query '{Objects: DeleteMarkers[].{Key:Key,VersionId:VersionId}}')"

# 4. CloudFormationスタックを削除
aws cloudformation delete-stack --stack-name s3-test-stack
```

### 方法 2: DeletionPolicy でバケットを保護

```yaml
Resources:
  TestBucket:
    Type: AWS::S3::Bucket
    DeletionPolicy: Retain # スタック削除時もバケットを保持
    Properties:
      BucketName: cf-test-bucket-versioned
```

## クリーンアップ

### LocalStack 環境でのクリーンアップ

```bash
# 残ったバケットがある場合は手動削除
aws s3 rb s3://cf-test-bucket-versioned --force 2>/dev/null || echo "バケットは既に削除されています"

# スタックが残っている場合は削除
aws cloudformation delete-stack --stack-name s3-test-stack 2>/dev/null || echo "スタックは既に削除されています"
```

## 重要なポイント

### 🛡️ **データ保護の仕組み**

- AWS は意図しないデータ消失を防ぐため、空でない S3 バケットの削除を制限
- CloudFormation でも同様の制限が適用される
- これは重要なセーフガード機能

### 📊 **LocalStack vs 本番 AWS**

- **LocalStack**: 開発用途のため制限が緩い
- **本番 AWS**: 厳格なデータ保護制限あり
- 学習時は両方の動作を理解することが重要

### 💡 **ベストプラクティス**

- 重要なデータには `DeletionPolicy: Retain` を設定
- テスト環境でも本番同様の手順を練習
- バージョン管理有効バケットの削除手順を習得

## 参考リンク

- [AWS CloudFormation S3 リソース](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-s3-bucket.html)
- [S3 バケットのバージョニング](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html)
- [CloudFormation DeletionPolicy](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-attribute-deletionpolicy.html)

## トラブルシューティング

### Q: バケットが削除されない

A: バケット内にオブジェクトまたはバージョン管理オブジェクトが残っている可能性があります。`aws s3api list-object-versions` で確認してください。

### Q: スタック削除が失敗する

A: 空でない S3 バケットが原因の可能性があります。手動でバケットを空にするか、`DeletionPolicy: Retain` の設定を検討してください。

### Q: LocalStack で本番同様の制限を再現したい

A: LocalStack の設定によっては制限を厳しくできる場合があります。ドキュメントを確認してください。
