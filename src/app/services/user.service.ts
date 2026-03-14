import { Injectable, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { withPreviousValue } from '../operators/with-previous-value';
import { withRetry } from '../operators/with-retry';
import { withDebounce } from '../operators/with-debounce';
import { User } from '../model/user';

@Injectable({ providedIn: 'root' })
export class UserService {
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

  selectUser(id: number): void {
    this.userId.set(id);
  }
}
