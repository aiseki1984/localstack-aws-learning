import json

import boto3

# LocalStackのエンドポイントURL
ENDPOINT_URL = 'http://localstack:4566'

s3 = boto3.client('s3', endpoint_url=ENDPOINT_URL)


def lambda_handler(event, context):
    for record in event['Records']:
        print(record)
        body = json.loads(record['body'])
        s3.put_object(
            Bucket='chapter05-bucket',
            Key=f"{body['id']}.json",
            Body=record['body'],
        )