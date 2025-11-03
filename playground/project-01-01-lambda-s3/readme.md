# Project-01-01: Lambda + S3 Multi-Language Practice

このプロジェクトでは、JavaScript、TypeScript、Python の 3 つの言語で Lambda 関数を作成し、S3 でのファイル操作を練習します。

## プロジェクト構造

```
project-01-lambda-s3/
├── readme.md
├── scripts/
│   ├── 01_setup_s3.sh        # S3バケット作成
│   ├── 02_setup_iam.sh       # IAMロール作成
│   ├── 03_deploy_js.sh       # JavaScript Lambda デプロイ
│   ├── 04_deploy_ts.sh       # TypeScript Lambda デプロイ
│   ├── 05_deploy_python.sh   # Python Lambda デプロイ
│   ├── 06_test_all.sh        # 全言語テスト実行
│   └── 07_cleanup.sh         # リソース削除
├── javascript/
│   ├── package.json
│   ├── index.js              # メイン Lambda 関数
│   └── test-files/           # テスト用ファイル
├── typescript/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   └── index.ts          # メイン Lambda 関数
│   ├── dist/                 # コンパイル後
│   └── test-files/           # テスト用ファイル
├── python/
│   ├── requirements.txt
│   ├── lambda_function.py    # メイン Lambda 関数
│   └── test-files/           # テスト用ファイル
└── test-data/
    ├── sample.txt
    ├── data.json
    └── config.yaml
```

## 実装する機能

各言語で以下の S3 操作を実装します：

### 基本操作

1. **ファイルアップロード**: テキストファイルを S3 にアップロード
2. **ファイル一覧取得**: S3 バケット内のファイル一覧表示
3. **ファイル読み取り**: S3 からファイルを読み取り、内容を表示
4. **ファイル更新**: 既存ファイルの内容を更新
5. **ファイル削除**: S3 からファイルを削除

### 応用操作

6. **フォルダー操作**: 仮想フォルダの作成・管理
7. **メタデータ操作**: ファイルのメタデータ設定・取得
8. **条件付き操作**: 特定条件でのファイル処理
9. **バッチ処理**: 複数ファイルの一括処理
10. **ログ出力**: 操作履歴を S3 に記録

## 環境設定

- LocalStack を使用してローカル開発環境を構築
- S3 バケット名: `lambda-s3-practice`
- 各言語の Lambda 関数名:
  - `s3-practice-js`
  - `s3-practice-ts`
  - `s3-practice-python`

## 学習目標

- 各言語での AWS SDK 使用方法
- Lambda 関数の基本的な構造と違い
- S3 API の理解と実践
- エラーハンドリングとログ出力
- 非同期処理の実装方法
- パフォーマンス比較

## 次のステップ

1. プロジェクト構造の作成
2. 基本的なセットアップスクリプトの作成
3. 各言語でのシンプルな S3 接続テスト
4. 段階的に機能を追加
