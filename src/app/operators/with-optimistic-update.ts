import { Resource } from '@angular/core';

export interface OptimisticResource<T> extends Resource<T> {
  applyOptimistic: (value: T) => void;
  reload: () => boolean;
}

export function withOptimisticUpdate<T>(input: Resource<T>): OptimisticResource<T> {
  return Object.assign(input, {
    applyOptimistic: (_value: T) => {},
    reload: () => false,
  }) as OptimisticResource<T>;
}
