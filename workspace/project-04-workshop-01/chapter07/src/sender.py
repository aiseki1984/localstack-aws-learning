import json
import os
import random

import boto3

# LocalStackのエンドポイントURL
ENDPOINT_URL = 'http://localstack:4566'
ENDPOINT_URL_TEST = 'http://localstack:14566'

env = os.environ.get('ENV', 'local')

if env == 'local':
    sqs = boto3.client('sqs', endpoint_url=ENDPOINT_URL)
elif env == 'test':
    sqs = boto3.client('sqs', endpoint_url=ENDPOINT_URL_TEST)


def main(event):
    number = random.randint(0, 9999)
    sqs.send_message(
        QueueUrl='http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/chapter07-queue',
        MessageBody=json.dumps(
            {
                'id': f'id{number:04}',
                'body': f'This is message {number:04}.',
            }
        ),
    )

    return {
        'statusCode': 200,
        'body': json.dumps(
            {'id': f'id{number:04}'},
        ),
    }


def lambda_handler(event, context):
    return main(event)