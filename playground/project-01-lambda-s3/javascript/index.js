const AWS = require('aws-sdk');

// S3クライアントの設定
const s3 = new AWS.S3({
  endpoint: process.env.LOCALSTACK_ENDPOINT || 'http://localstack:4566',
  s3ForcePathStyle: true,
  region: process.env.AWS_REGION || 'us-east-1',
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'lambda-s3-practice';

/**
 * メインのLambda handler
 */
exports.handler = async (event) => {
  console.log('📨 Received event:', JSON.stringify(event, null, 2));

  try {
    const { action, ...params } = event;

    let result;
    switch (action) {
      case 'upload':
        result = await uploadFile(params);
        break;
      case 'list':
        result = await listFiles(params);
        break;
      case 'read':
        result = await readFile(params);
        break;
      case 'update':
        result = await updateFile(params);
        break;
      case 'delete':
        result = await deleteFile(params);
        break;
      case 'test':
        result = await runTests();
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Operation completed successfully',
        data: result,
        language: 'JavaScript',
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error('❌ Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        language: 'JavaScript',
        timestamp: new Date().toISOString(),
      }),
    };
  }
};

/**
 * ファイルアップロード
 */
async function uploadFile({ fileName, content, folder = 'javascript-files' }) {
  const key = `${folder}/${fileName}`;

  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Body: content,
    ContentType: getContentType(fileName),
    Metadata: {
      'upload-time': new Date().toISOString(),
      language: 'javascript',
    },
  };

  const result = await s3.putObject(params).promise();

  console.log(`✅ File uploaded: ${key}`);
  return {
    key,
    etag: result.ETag,
    size: Buffer.byteLength(content, 'utf8'),
  };
}

/**
 * ファイル一覧取得
 */
async function listFiles({ folder = 'javascript-files', maxKeys = 10 }) {
  const params = {
    Bucket: BUCKET_NAME,
    Prefix: folder + '/',
    MaxKeys: maxKeys,
  };

  const result = await s3.listObjectsV2(params).promise();

  const files = result.Contents.map((obj) => ({
    key: obj.Key,
    size: obj.Size,
    lastModified: obj.LastModified,
    etag: obj.ETag,
  }));

  console.log(`📋 Found ${files.length} files in ${folder}/`);
  return {
    folder,
    count: files.length,
    files,
  };
}

/**
 * ファイル読み取り
 */
async function readFile({ fileName, folder = 'javascript-files' }) {
  const key = `${folder}/${fileName}`;

  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
  };

  const result = await s3.getObject(params).promise();

  console.log(`📖 File read: ${key}`);
  return {
    key,
    content: result.Body.toString('utf-8'),
    metadata: result.Metadata,
    contentType: result.ContentType,
    lastModified: result.LastModified,
  };
}

/**
 * ファイル更新
 */
async function updateFile({ fileName, content, folder = 'javascript-files' }) {
  const key = `${folder}/${fileName}`;

  // 既存ファイルの存在確認
  try {
    await s3.headObject({ Bucket: BUCKET_NAME, Key: key }).promise();
  } catch (error) {
    if (error.code === 'NotFound') {
      throw new Error(`File not found: ${key}`);
    }
    throw error;
  }

  // ファイル更新
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Body: content,
    ContentType: getContentType(fileName),
    Metadata: {
      'update-time': new Date().toISOString(),
      language: 'javascript',
    },
  };

  const result = await s3.putObject(params).promise();

  console.log(`🔄 File updated: ${key}`);
  return {
    key,
    etag: result.ETag,
    size: Buffer.byteLength(content, 'utf8'),
  };
}

/**
 * ファイル削除
 */
async function deleteFile({ fileName, folder = 'javascript-files' }) {
  const key = `${folder}/${fileName}`;

  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
  };

  await s3.deleteObject(params).promise();

  console.log(`🗑️ File deleted: ${key}`);
  return { key };
}

/**
 * 基本テストの実行
 */
async function runTests() {
  const testFileName = `test-${Date.now()}.txt`;
  const testContent = `Hello from JavaScript Lambda!\nTest created at: ${new Date().toISOString()}`;

  console.log('🧪 Running JavaScript Lambda tests...');

  // 1. Upload test
  const uploadResult = await uploadFile({
    fileName: testFileName,
    content: testContent,
  });

  // 2. Read test
  const readResult = await readFile({
    fileName: testFileName,
  });

  // 3. Update test
  const updateContent = testContent + '\n\nUpdated content!';
  const updateResult = await updateFile({
    fileName: testFileName,
    content: updateContent,
  });

  // 4. List test
  const listResult = await listFiles({});

  // 5. Delete test
  const deleteResult = await deleteFile({
    fileName: testFileName,
  });

  return {
    upload: uploadResult,
    read: readResult,
    update: updateResult,
    list: listResult,
    delete: deleteResult,
    testsPassed: 5,
  };
}

/**
 * Content-Type を推定
 */
function getContentType(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  const mimeTypes = {
    txt: 'text/plain',
    json: 'application/json',
    js: 'application/javascript',
    html: 'text/html',
    css: 'text/css',
    yml: 'text/yaml',
    yaml: 'text/yaml',
  };
  return mimeTypes[ext] || 'text/plain';
}
