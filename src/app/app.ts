import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { withPreviousValue } from './operators/with-previous-value';
import { withRetry } from './operators/with-retry';
import { withDebounce } from './operators/with-debounce';
import { withCache } from './operators/with-cache';
import { withOptimisticUpdate } from './operators/with-optimistic-update';
import { User } from './model/user';
import { Product } from './model/product';
import { Todo } from './model/todo';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  readonly userIds = [1, 2, 3] as const;
  readonly userId = signal(1);

  // withDebounce( withRetry( withPreviousValue( httpResource ) ) )
  // Leia de dentro para fora: busca HTTP → mantém valor anterior → retry automático → suprime flash de loading
  readonly user = withDebounce(
    withRetry(
      withPreviousValue(httpResource<User>(() => `/api/users/${this.userId()}`)),
      { maxRetries: 3 },
    ),
    300,
  );

  // withCache: lista de produtos em cache por 60s para evitar requisições repetidas
  readonly products = withCache(
    httpResource<Product[]>(() => '/api/products'),
    { key: 'products', ttl: 60000 },
  );

  // withOptimisticUpdate: toggle instantâneo antes da resposta do servidor
  readonly todos = withOptimisticUpdate(httpResource<Todo[]>(() => '/api/todos'));

  selectUser(id: number): void {
    this.userId.set(id);
  }

  async toggleTodo(todo: Todo): Promise<void> {
    const current = this.todos.value();
    if (!current) return;

    const updated = current.map((t) =>
      t.id === todo.id ? { ...t, completed: !t.completed } : t,
    );

    this.todos.applyOptimistic(updated);

    await fetch(`/api/todos/${todo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !todo.completed }),
    });

    this.todos.reload();
  }
}
