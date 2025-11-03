import json
import boto3
import os
from datetime import datetime
import uuid
from typing import Dict, Any, Optional

# S3 クライアントの設定
s3_client = boto3.client(
    's3',
    endpoint_url=os.environ.get('LOCALSTACK_ENDPOINT'),
    aws_access_key_id='test',
    aws_secret_access_key='test'
)

BUCKET_NAME = os.environ.get('S3_BUCKET_NAME', 'lambda-s3-practice')

def upload_file(key: str, content: str, metadata: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    """S3ファイルアップロード"""
    try:
        if metadata is None:
            metadata = {}
        
        response = s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=key,
            Body=content,
            ContentType='text/plain',
            Metadata=metadata
        )
        
        return {
            'success': True,
            'data': {
                'key': key,
                'etag': response['ETag'],
                'size': len(content.encode('utf-8'))
            }
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def read_file(key: str) -> Dict[str, Any]:
    """S3ファイル読み込み"""
    try:
        response = s3_client.get_object(Bucket=BUCKET_NAME, Key=key)
        
        return {
            'success': True,
            'data': {
                'key': key,
                'content': response['Body'].read().decode('utf-8'),
                'metadata': response.get('Metadata', {}),
                'contentType': response.get('ContentType'),
                'lastModified': response.get('LastModified').isoformat() if response.get('LastModified') else None
            }
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def update_file(key: str, new_content: str, metadata: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    """S3ファイル更新"""
    try:
        # 既存ファイルのメタデータを取得
        try:
            head_response = s3_client.head_object(Bucket=BUCKET_NAME, Key=key)
            existing_metadata = head_response.get('Metadata', {})
        except:
            existing_metadata = {}
        
        # メタデータをマージ
        if metadata:
            existing_metadata.update(metadata)
        
        # ファイルを更新
        response = s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=key,
            Body=new_content,
            ContentType='text/plain',
            Metadata=existing_metadata
        )
        
        return {
            'success': True,
            'data': {
                'key': key,
                'etag': response['ETag'],
                'size': len(new_content.encode('utf-8'))
            }
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def list_files(prefix: str = '') -> Dict[str, Any]:
    """S3ファイル一覧取得"""
    try:
        response = s3_client.list_objects_v2(Bucket=BUCKET_NAME, Prefix=prefix)
        
        files = []
        if 'Contents' in response:
            for obj in response['Contents']:
                files.append({
                    'key': obj['Key'],
                    'size': obj['Size'],
                    'lastModified': obj['LastModified'].isoformat(),
                    'etag': obj['ETag']
                })
        
        return {
            'success': True,
            'data': {
                'folder': prefix,
                'count': len(files),
                'files': files
            }
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def delete_file(key: str) -> Dict[str, Any]:
    """S3ファイル削除"""
    try:
        s3_client.delete_object(Bucket=BUCKET_NAME, Key=key)
        
        return {
            'success': True,
            'data': {'key': key}
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def run_comprehensive_test() -> Dict[str, Any]:
    """包括的なS3操作テスト"""
    timestamp = int(datetime.now().timestamp() * 1000)
    test_key = f'python-files/test-{timestamp}.txt'
    results = {}
    tests_passed = 0
    
    try:
        # 1. ファイルアップロードテスト
        print('Testing upload...')
        upload_result = upload_file(
            test_key,
            f'Hello from Python Lambda!\nTest created at: {datetime.now().isoformat()}',
            {
                'upload-time': datetime.now().isoformat(),
                'language': 'python'
            }
        )
        results['upload'] = upload_result.get('data')
        if upload_result['success']:
            tests_passed += 1

        # 2. ファイル読み込みテスト
        print('Testing read...')
        read_result = read_file(test_key)
        results['read'] = read_result.get('data')
        if read_result['success']:
            tests_passed += 1

        # 3. ファイル更新テスト
        print('Testing update...')
        original_content = read_result.get('data', {}).get('content', '')
        update_result = update_file(
            test_key,
            f'Updated content from Python!\nOriginal: {original_content}',
            {'updated-at': datetime.now().isoformat()}
        )
        results['update'] = update_result.get('data')
        if update_result['success']:
            tests_passed += 1

        # 4. ファイル一覧テスト
        print('Testing list...')
        list_result = list_files('python-files')
        results['list'] = list_result.get('data')
        if list_result['success']:
            tests_passed += 1

        # 5. ファイル削除テスト
        print('Testing delete...')
        delete_result = delete_file(test_key)
        results['delete'] = delete_result.get('data')
        if delete_result['success']:
            tests_passed += 1

        return {'results': results, 'testsPassed': tests_passed}
    except Exception as e:
        print(f'Test error: {e}')
        return {'results': {'error': str(e)}, 'testsPassed': tests_passed}

def lambda_handler(event, context):
    """Lambda ハンドラー関数"""
    print(f'Event: {json.dumps(event)}')
    
    try:
        # イベントからbodyを取得
        if 'body' in event:
            if isinstance(event['body'], str):
                body = json.loads(event['body'])
            else:
                body = event['body']
        else:
            body = event
        
        action = body.get('action', 'test')
        print(f'Performing action: {action}')

        if action == 'test':
            test_results = run_comprehensive_test()
            result = {
                'success': True,
                'message': 'Operation completed successfully',
                'data': {
                    **test_results['results'],
                    'testsPassed': test_results['testsPassed']
                },
                'language': 'Python',
                'timestamp': datetime.now().isoformat()
            }
        
        elif action == 'upload':
            upload_res = upload_file(body['key'], body['content'], body.get('metadata', {}))
            result = {
                'success': upload_res['success'],
                'message': 'File uploaded successfully' if upload_res['success'] else 'Upload failed',
                'data': upload_res.get('data'),
                'error': upload_res.get('error'),
                'language': 'Python',
                'timestamp': datetime.now().isoformat()
            }
        
        elif action == 'read':
            read_res = read_file(body['key'])
            result = {
                'success': read_res['success'],
                'message': 'File read successfully' if read_res['success'] else 'Read failed',
                'data': read_res.get('data'),
                'error': read_res.get('error'),
                'language': 'Python',
                'timestamp': datetime.now().isoformat()
            }
        
        elif action == 'update':
            update_res = update_file(body['key'], body['content'], body.get('metadata', {}))
            result = {
                'success': update_res['success'],
                'message': 'File updated successfully' if update_res['success'] else 'Update failed',
                'data': update_res.get('data'),
                'error': update_res.get('error'),
                'language': 'Python',
                'timestamp': datetime.now().isoformat()
            }
        
        elif action == 'list':
            list_res = list_files(body.get('prefix', ''))
            result = {
                'success': list_res['success'],
                'message': 'Files listed successfully' if list_res['success'] else 'List failed',
                'data': list_res.get('data'),
                'error': list_res.get('error'),
                'language': 'Python',
                'timestamp': datetime.now().isoformat()
            }
        
        elif action == 'delete':
            delete_res = delete_file(body['key'])
            result = {
                'success': delete_res['success'],
                'message': 'File deleted successfully' if delete_res['success'] else 'Delete failed',
                'data': delete_res.get('data'),
                'error': delete_res.get('error'),
                'language': 'Python',
                'timestamp': datetime.now().isoformat()
            }
        
        else:
            result = {
                'success': False,
                'message': f'Unknown action: {action}',
                'language': 'Python',
                'timestamp': datetime.now().isoformat()
            }

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(result)
        }

    except Exception as e:
        print(f'Handler error: {e}')
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'success': False,
                'message': 'Internal server error',
                'error': str(e),
                'language': 'Python',
                'timestamp': datetime.now().isoformat()
            })
        }