"""
SQSからメッセージを受信してS3に保存するスクリプト
- SQSキューからメッセージを取得
- 取得したメッセージをS3バケットにJSONファイルとして保存
- 処理済みメッセージをSQSから削除
"""
import json

import boto3

# LocalStackのエンドポイントURL
ENDPOINT_URL = 'http://localstack:4566'

# SQSクライアントを初期化（LocalStackエンドポイントを指定）
sqs = boto3.client('sqs', endpoint_url=ENDPOINT_URL)

# 処理対象のSQSキューのURL
queue_url = 'http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/chapter03-queue-03'

# SQSキューからメッセージを受信（最大10件まで取得）
response = sqs.receive_message(
    QueueUrl=queue_url,
    MaxNumberOfMessages=10,
)

# S3クライアントを初期化（LocalStackエンドポイントを指定）
s3 = boto3.client('s3', endpoint_url=ENDPOINT_URL)

# 受信したメッセージを順番に処理
for message in response.get('Messages', []):
    # メッセージ本文をJSONとしてパース
    body = json.loads(message['Body'])
    
    # S3バケットにメッセージ内容をJSONファイルとして保存
    # ファイル名はメッセージ内のidを使用（例: "12345.json"）
    s3.put_object(
        Bucket='chapter03-bucket',
        Key=f"{body['id']}.json",
        Body=message['Body'],
    )
    print(f"Received and processed message: {message['Body']}")

    # 処理が完了したメッセージをSQSキューから削除
    sqs.delete_message(
        QueueUrl=queue_url,
        ReceiptHandle=message['ReceiptHandle'],
    )