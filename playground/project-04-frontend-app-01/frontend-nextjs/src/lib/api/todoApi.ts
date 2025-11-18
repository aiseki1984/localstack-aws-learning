import {
  Todo,
  GetTodosResponse,
  CreateTodoRequest,
  CreateTodoResponse,
  UpdateTodoRequest,
  UpdateTodoResponse,
  DeleteTodoResponse,
  ApiError,
} from '@/types/api';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://rpreopc65q.execute-api.localhost.localstack.cloud:4566/prod';

class TodoApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        message: 'An error occurred',
      }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // GET /todos - 全てのTodoを取得
  async getTodos(): Promise<Todo[]> {
    const response = await fetch(`${this.baseUrl}/todos`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await this.handleResponse<GetTodosResponse>(response);
    return data.todos;
  }

  // POST /todos - 新しいTodoを作成
  async createTodo(request: CreateTodoRequest): Promise<Todo> {
    const response = await fetch(`${this.baseUrl}/todos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    const data = await this.handleResponse<CreateTodoResponse>(response);
    return data.todo;
  }

  // PUT /todos/{id} - Todoを更新
  async updateTodo(id: string, request: UpdateTodoRequest): Promise<Todo> {
    const response = await fetch(`${this.baseUrl}/todos/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    const data = await this.handleResponse<UpdateTodoResponse>(response);
    return data.todo;
  }

  // DELETE /todos/{id} - Todoを削除
  async deleteTodo(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/todos/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    await this.handleResponse<DeleteTodoResponse>(response);
  }
}

// シングルトンインスタンス
export const todoApi = new TodoApiClient(API_BASE_URL);
