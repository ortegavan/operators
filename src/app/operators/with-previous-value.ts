import { Resource } from '@angular/core';

export function withPreviousValue<T>(input: Resource<T>): Resource<T> {
  return input;
}
