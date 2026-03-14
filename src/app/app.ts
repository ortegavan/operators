import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { UserService } from './services/user.service';
import { ProductService } from './services/product.service';
import { TodoService } from './services/todo.service';
import { Todo } from './model/todo';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  readonly userIds = [1, 2, 3] as const;

  protected readonly userService = inject(UserService);
  protected readonly productService = inject(ProductService);
  protected readonly todoService = inject(TodoService);

  selectUser(id: number): void {
    this.userService.selectUser(id);
  }

  toggleTodo(todo: Todo): void {
    this.todoService.toggleTodo(todo);
  }
}
