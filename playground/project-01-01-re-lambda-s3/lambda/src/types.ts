// Lambda関数の共通型定義

export interface LambdaResponse {
  statusCode: number;
  headers?: { [key: string]: string };
  body: string;
}

export interface FileUploadRequest {
  fileName: string;
  content: string;
}

export interface FileInfo {
  key?: string;
  fileName?: string;
  size?: number;
  lastModified?: Date;
}

export interface UploadResponse {
  message: string;
  bucket: string;
  key: string;
  fileName: string;
}

export interface FileContentResponse {
  fileName: string;
  content?: string;
  contentType?: string;
  lastModified?: Date;
  metadata?: { [key: string]: string };
}

export interface FileListResponse {
  bucket: string;
  files: FileInfo[];
  count: number;
}

export interface DeleteResponse {
  message: string;
  fileName: string;
  key: string;
}

export interface ErrorResponse {
  error: string;
  message?: string;
  hint?: string;
}