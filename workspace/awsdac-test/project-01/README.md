# awsdac (AWS Diagram As Code) 学習ガイド

## 概要

`awsdac`は、YAML ファイルで AWS アーキテクチャ図を定義し、PNG、SVG、DrawIO 形式で出力できるツールです。
MCP サーバーとして統合することで、Copilot から直接ダイアグラムを生成・管理できます。

## できること

### 1. アーキテクチャ図の生成

- YAML ファイルから AWS アーキテクチャ図を自動生成
- **コマンドライン**: PNG 形式で出力可能
- **MCP サーバー**: PNG 形式のみ対応（base64 またはファイル保存）
- 公式 AWS アイコンを使用した見やすい図

### 2. 対応リソース

- AWS 基本リソース（VPC、Subnet、EC2、Lambda 等）
- ネットワーク（API Gateway、VPC Endpoint、Security Group）
- データストア（DynamoDB、S3、RDS）
- コンピューティング（Lambda、ECS、EKS）
- その他の主要 AWS サービス

### 3. ダイアグラム機能

- 階層構造（Cloud、VPC、Subnet 等）
- リソース間の接続線（矢印）
- カスタムラベルとタイトル
- 水平/垂直レイアウト

## 基本的な使い方

### コマンドライン

```bash
# PNG形式で出力（デフォルト）
awsdac diagram.yaml -o output.png
```

### YAML ファイルの基本構造

```yaml
Diagram:
  DefinitionFiles:
    - Type: URL
      Url: 'https://raw.githubusercontent.com/awslabs/diagram-as-code/main/definitions/definition-for-aws-icons-light.yaml'

  Resources:
    Canvas:
      Type: AWS::Diagram::Canvas
      Children:
        - MyVPC

    MyVPC:
      Type: AWS::EC2::VPC
      Title: 'VPC (10.0.0.0/16)'
      Children:
        - MySubnet

    MySubnet:
      Type: AWS::EC2::Subnet
      Title: 'Public Subnet'
      Children:
        - MyLambda

    MyLambda:
      Type: AWS::Lambda::Function
      Title: 'Lambda Function'

  Links:
    - Source: MyLambda
      Target: MyDynamoDB
      TargetArrowHead:
        Type: Open
```

## サンプルプロジェクト

このディレクトリの`diagram.yaml`には、以下を含むセキュアな構成例があります：

- API Gateway（パブリック）
- VPC 内の Private Subnet に Lambda 配置
- VPC Endpoint 経由で DynamoDB アクセス
- Lambda Extension で Parameter Store 連携

## 便利な機能

### レイアウト制御

- `Direction: horizontal` - 水平配置
- `Direction: vertical` - 垂直配置
- `Align: center` - 中央揃え

### リソースタイプ

- `AWS::Diagram::Canvas` - キャンバス
- `AWS::Diagram::Cloud` - AWS クラウド境界
- `AWS::Diagram::VerticalStack` - 縦スタック
- `AWS::Diagram::HorizontalStack` - 横スタック
- `AWS::EC2::VPC` - VPC
- `AWS::Lambda::Function` - Lambda
- その他、AWS の主要サービスに対応

### 接続線のオプション

- `Type: orthogonal` - 直角の線
- `TargetArrowHead: Open` - 矢印
- `Labels` - ラベル追加

## よくある問題と対処法

### 利用可能なリソースタイプの確認

定義ファイルで利用可能なタイプを確認：

```bash
curl -s https://raw.githubusercontent.com/awslabs/diagram-as-code/main/definitions/definition-for-aws-icons-light.yaml | grep "^  AWS::"
```

## 参考リンク

- [AWS Diagram as Code 公式リポジトリ](https://github.com/awslabs/diagram-as-code)
- [定義ファイル](https://raw.githubusercontent.com/awslabs/diagram-as-code/main/definitions/definition-for-aws-icons-light.yaml)
