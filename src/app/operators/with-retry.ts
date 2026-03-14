import {
  effect,
  inject,
  Injector,
  linkedSignal,
  Resource,
  ResourceSnapshot,
  resourceFromSnapshots,
  signal,
  untracked,
  WritableResource,
} from '@angular/core';

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
}

export function withRetry<T>(input: Resource<T>, options?: RetryOptions): Resource<T> {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 10000 } = options ?? {};
  const injector = inject(Injector);
  const retryCount = signal(0);

  effect(
    () => {
      const snapshot = input.snapshot();

      if (snapshot.status === 'error') {
        const currentRetry = untracked(retryCount);

        if (currentRetry < maxRetries) {
          const delay = Math.min(baseDelay * Math.pow(2, currentRetry), maxDelay);

          setTimeout(() => {
            retryCount.update((c) => c + 1);
            (input as WritableResource<T>).reload?.();
          }, delay);
        }
      }

      if (snapshot.status === 'resolved') {
        untracked(() => retryCount.set(0));
      }
    },
    { injector },
  );

  const derived = linkedSignal<ResourceSnapshot<T>, ResourceSnapshot<T>>({
    source: input.snapshot,
    computation: (snapshot) => {
      if (snapshot.status === 'error' && retryCount() < maxRetries) {
        return { status: 'loading', value: undefined } as unknown as ResourceSnapshot<T>;
      }
      return snapshot;
    },
  });

  return resourceFromSnapshots(derived);
}
