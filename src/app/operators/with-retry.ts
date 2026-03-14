import { Resource } from '@angular/core';

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
}

export function withRetry<T>(input: Resource<T>, _options?: RetryOptions): Resource<T> {
  return input;
}
