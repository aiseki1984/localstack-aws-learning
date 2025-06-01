import json
import os

import boto3

# LocalStackのエンドポイントURL
ENDPOINT_URL = 'http://localstack:4566'
ENDPOINT_URL_TEST = 'http://localstack:14566'

env = os.environ.get('ENV', 'local')

if env == 'local':
    s3 = boto3.client('s3', endpoint_url=ENDPOINT_URL)
elif env == 'test':
    s3 = boto3.client('s3', endpoint_url=ENDPOINT_URL_TEST)


def main(event):
    for record in event['Records']:
        print(record)
        body = json.loads(record['body'])
        s3.put_object(
            Bucket='chapter07-bucket',
            Key=f"chapter07/{body['id']}.json",
            Body=record['body'],
        )


def lambda_handler(event, context):
    main(event)