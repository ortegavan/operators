import {
  linkedSignal,
  Resource,
  ResourceSnapshot,
  resourceFromSnapshots,
  signal,
  untracked,
  WritableResource,
} from '@angular/core';

export interface OptimisticResource<T> extends Resource<T> {
  applyOptimistic: (value: T) => void;
  reload: () => boolean;
}

export function withOptimisticUpdate<T>(input: Resource<T>): OptimisticResource<T> {
  const optimisticValue = signal<T | null>(null);

  const derived = linkedSignal<ResourceSnapshot<T>, ResourceSnapshot<T>>({
    source: input.snapshot,
    computation: (snapshot) => {
      const pending = optimisticValue();

      if (pending !== null && (snapshot.status === 'loading' || snapshot.status === 'reloading')) {
        return { status: 'resolved', value: pending } as ResourceSnapshot<T>;
      }

      if (snapshot.status === 'resolved' || snapshot.status === 'error') {
        untracked(() => optimisticValue.set(null));
      }

      return snapshot;
    },
  });

  const resource = resourceFromSnapshots(derived);

  return Object.assign(resource, {
    applyOptimistic: (value: T) => optimisticValue.set(value),
    reload: () => (input as WritableResource<T>).reload?.() ?? false,
  }) as OptimisticResource<T>;
}
