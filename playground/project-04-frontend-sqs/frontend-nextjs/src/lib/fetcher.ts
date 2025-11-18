// API Gateway URL - LocalStack用
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://aqcbeyvuwh.execute-api.localhost.localstack.cloud:4566/prod/';

export const fetcher = async <T>(url: string): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${url}`);

  if (!response.ok) {
    throw new Error('An error occurred while fetching the data.');
  }

  return response.json() as Promise<T>;
};

export const poster = async <T, D>(url: string, data: D): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'An error occurred while posting the data.');
  }

  return response.json() as Promise<T>;
};
