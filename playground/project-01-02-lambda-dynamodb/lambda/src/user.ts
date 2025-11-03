import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { dynamodb } from './dynamodb';
import { UserItem, CreateUserRequest } from './types';

export const putUser = async (user: CreateUserRequest): Promise<UserItem> => {
  const item: UserItem = {
    ...user,
    createdAt: new Date().toISOString(),
  };

  await dynamodb.send(
    new PutCommand({
      TableName: process.env.TABLE_NAME || 'users',
      Item: item,
    })
  );

  return item;
};

export const getUser = async (id: string): Promise<UserItem | null> => {
  const result = await dynamodb.send(
    new GetCommand({
      TableName: process.env.TABLE_NAME || 'users',
      Key: { id },
    })
  );

  return (result.Item as UserItem) || null;
};
