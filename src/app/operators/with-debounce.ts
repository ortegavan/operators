import { Resource } from '@angular/core';

export function withDebounce<T>(input: Resource<T>, _delayMs = 300): Resource<T> {
  return input;
}
