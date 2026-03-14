import { Injectable, inject } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { withOptimisticUpdate } from '../operators/with-optimistic-update';
import { Todo } from '../model/todo';

@Injectable({ providedIn: 'root' })
export class TodoService {
  private readonly http = inject(HttpClient);

  // withOptimisticUpdate: toggle instantâneo antes da resposta do servidor
  readonly todos = withOptimisticUpdate(httpResource<Todo[]>(() => '/api/todos'));

  async toggleTodo(todo: Todo): Promise<void> {
    const current = this.todos.value();
    if (!current) return;

    const updated = current.map((t) =>
      t.id === todo.id ? { ...t, completed: !t.completed } : t,
    );

    this.todos.applyOptimistic(updated);

    await firstValueFrom(
      this.http.patch(`/api/todos/${todo.id}`, { completed: !todo.completed }),
    );

    this.todos.reload();
  }
}
