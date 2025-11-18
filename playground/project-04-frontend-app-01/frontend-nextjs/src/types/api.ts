// Todo型定義
export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

// APIレスポンス型定義
export interface GetTodosResponse {
  todos: Todo[];
}

export interface CreateTodoRequest {
  title: string;
}

export interface CreateTodoResponse {
  todo: Todo;
}

export interface UpdateTodoRequest {
  completed: boolean;
}

export interface UpdateTodoResponse {
  todo: Todo;
}

export interface DeleteTodoResponse {
  message: string;
}

export interface ApiError {
  message: string;
  error?: string;
}
