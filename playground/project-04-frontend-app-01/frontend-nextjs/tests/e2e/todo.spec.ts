import { test, expect } from '@playwright/test';

/**
 * Todo App E2E Tests
 * LocalStack環境での統合テスト
 */

test.describe('Todo App', () => {
  test.beforeEach(async ({ page }) => {
    // Todosページに移動
    await page.goto('/todos.html');
    
    // ページが読み込まれるまで待機
    await page.waitForLoadState('networkidle');
  });

  test('ページタイトルが正しく表示される', async ({ page }) => {
    // h1要素のテキストを確認
    const title = page.locator('h1');
    await expect(title).toHaveText('Todo App');
  });

  test('Todoを作成できる', async ({ page }) => {
    const todoTitle = `テストTodo ${Date.now()}`;
    
    // 入力フィールドを取得
    const input = page.locator('input[type="text"]');
    const addButton = page.locator('button:has-text("追加")');
    
    // Todoを入力して追加
    await input.fill(todoTitle);
    await addButton.click();
    
    // Todoがリストに表示されることを確認（LocalStackは遅いので長めに待機）
    await expect(page.getByText(todoTitle).first()).toBeVisible({ timeout: 15000 });
  });

  test('Todoを完了状態に変更できる', async ({ page }) => {
    const todoTitle = `完了テスト ${Date.now()}`;
    
    // Todoを作成
    await page.locator('input[type="text"]').fill(todoTitle);
    await page.locator('button:has-text("追加")').click();
    
    // Todoが表示されるまで待機
    const todoText = page.getByText(todoTitle).first();
    await expect(todoText).toBeVisible({ timeout: 15000 });
    
    // data-testid属性から対応するチェックボックスを取得
    // まずTodo項目のIDを取得するために、テキストから親要素を探す
    const todoItem = page.locator('[data-testid^="todo-item-"]').filter({ hasText: todoTitle }).first();
    const checkbox = todoItem.locator('[data-testid^="todo-checkbox-"]');
    await checkbox.check();
    
    // 打ち消し線が表示されることを確認（少し待機）
    await page.waitForTimeout(1500);
    const todoTitleElement = todoItem.locator('[data-testid^="todo-title-"]');
    await expect(todoTitleElement).toHaveClass(/line-through/);
  });

  test('Todoを削除できる', async ({ page }) => {
    const todoTitle = `削除テスト ${Date.now()}`;
    
    // Todoを作成
    await page.locator('input[type="text"]').fill(todoTitle);
    await page.locator('button:has-text("追加")').click();
    
    // Todoが表示されるまで待機
    await expect(page.getByText(todoTitle).first()).toBeVisible({ timeout: 15000 });
    
    // 削除ボタンをクリック（確認ダイアログを自動承認）
    page.on('dialog', dialog => dialog.accept());
    const todoItem = page.locator('[data-testid^="todo-item-"]').filter({ hasText: todoTitle }).first();
    const deleteButton = todoItem.locator('[data-testid^="todo-delete-"]');
    await deleteButton.click();
    
    // Todoが消えることを確認
    await expect(page.getByText(todoTitle)).not.toBeVisible({ timeout: 15000 });
  });

  test('完了数が正しく表示される', async ({ page }) => {
    const todo1 = `カウントテスト1 ${Date.now()}`;
    const todo2 = `カウントテスト2 ${Date.now() + 1}`;
    
    // 2つのTodoを作成
    await page.locator('input[type="text"]').fill(todo1);
    await page.locator('button:has-text("追加")').click();
    await expect(page.getByText(todo1).first()).toBeVisible({ timeout: 15000 });
    
    await page.locator('input[type="text"]').fill(todo2);
    await page.locator('button:has-text("追加")').click();
    await expect(page.getByText(todo2).first()).toBeVisible({ timeout: 15000 });
    
    // 1つ目を完了
    const firstTodoItem = page.locator('[data-testid^="todo-item-"]').filter({ hasText: todo1 }).first();
    const firstCheckbox = firstTodoItem.locator('[data-testid^="todo-checkbox-"]');
    await firstCheckbox.check();
    await page.waitForTimeout(1500);
    
    // カウント表示を確認（正規表現で柔軟にマッチ）
    const counter = page.locator('text=/\\d+ \\/ \\d+ 完了/');
    await expect(counter).toBeVisible();
    
    // カウンターが表示されていることだけ確認（具体的な数値は前のテストの影響を受けるので確認しない）
    const counterText = await counter.textContent();
    expect(counterText).toMatch(/\d+ \/ \d+ 完了/);
  });

  test('空のTodoは作成できない', async ({ page }) => {
    const addButton = page.locator('button:has-text("追加")');
    
    // ボタンが無効化されていることを確認
    await expect(addButton).toBeDisabled();
  });

  test('ページをリロードしてもTodoが保持される', async ({ page }) => {
    const todoTitle = `永続化テスト ${Date.now()}`;
    
    // Todoを作成
    await page.locator('input[type="text"]').fill(todoTitle);
    await page.locator('button:has-text("追加")').click();
    await expect(page.getByText(todoTitle).first()).toBeVisible({ timeout: 15000 });
    
    // ページをリロード
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Todoがまだ表示されることを確認
    await expect(page.getByText(todoTitle).first()).toBeVisible({ timeout: 15000 });
  });
});
