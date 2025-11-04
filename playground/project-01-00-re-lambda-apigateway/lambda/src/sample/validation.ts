// バリデーション強化の例
import { CreatePostRequest, UpdatePostRequest } from './types';

export class ValidationError extends Error {
  constructor(public field: string, message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const validateCreatePostRequest = (data: any): CreatePostRequest => {
  const errors: string[] = [];

  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.push('Title is required and must be a non-empty string');
  }

  if (data.title && data.title.length > 200) {
    errors.push('Title must be 200 characters or less');
  }

  if (!data.content || typeof data.content !== 'string' || data.content.trim().length === 0) {
    errors.push('Content is required and must be a non-empty string');
  }

  if (!data.author || typeof data.author !== 'string' || data.author.trim().length === 0) {
    errors.push('Author is required and must be a non-empty string');
  }

  if (data.tags && (!Array.isArray(data.tags) || data.tags.some(tag => typeof tag !== 'string'))) {
    errors.push('Tags must be an array of strings');
  }

  if (data.status && !['draft', 'published'].includes(data.status)) {
    errors.push('Status must be either "draft" or "published"');
  }

  if (errors.length > 0) {
    throw new ValidationError('validation', errors.join('; '));
  }

  return {
    title: data.title.trim(),
    content: data.content.trim(),
    author: data.author.trim(),
    tags: data.tags || [],
    status: data.status || 'draft',
  };
};

export const validateUpdatePostRequest = (data: any): UpdatePostRequest => {
  const errors: string[] = [];

  if (data.title !== undefined) {
    if (typeof data.title !== 'string' || data.title.trim().length === 0) {
      errors.push('Title must be a non-empty string');
    }
    if (data.title.length > 200) {
      errors.push('Title must be 200 characters or less');
    }
  }

  if (data.content !== undefined) {
    if (typeof data.content !== 'string' || data.content.trim().length === 0) {
      errors.push('Content must be a non-empty string');
    }
  }

  if (data.author !== undefined) {
    if (typeof data.author !== 'string' || data.author.trim().length === 0) {
      errors.push('Author must be a non-empty string');
    }
  }

  if (data.tags !== undefined) {
    if (!Array.isArray(data.tags) || data.tags.some(tag => typeof tag !== 'string')) {
      errors.push('Tags must be an array of strings');
    }
  }

  if (data.status !== undefined) {
    if (!['draft', 'published', 'archived'].includes(data.status)) {
      errors.push('Status must be "draft", "published", or "archived"');
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('validation', errors.join('; '));
  }

  const result: UpdatePostRequest = {};
  if (data.title !== undefined) result.title = data.title.trim();
  if (data.content !== undefined) result.content = data.content.trim();
  if (data.author !== undefined) result.author = data.author.trim();
  if (data.tags !== undefined) result.tags = data.tags;
  if (data.status !== undefined) result.status = data.status;

  return result;
};