import { Resource } from '@angular/core';

export interface CacheOptions {
  key: string;
  ttl?: number;
}

export function withCache<T>(input: Resource<T>, _options: CacheOptions): Resource<T> {
  return input;
}
