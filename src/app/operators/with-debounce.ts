import {
  effect,
  inject,
  Injector,
  linkedSignal,
  Resource,
  ResourceSnapshot,
  resourceFromSnapshots,
  signal,
} from '@angular/core';

export function withDebounce<T>(input: Resource<T>, delayMs = 300): Resource<T> {
  const injector = inject(Injector);
  const debounced = signal<ResourceSnapshot<T>>(input.snapshot());

  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  effect(
    () => {
      const snapshot = input.snapshot();

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (snapshot.status === 'loading' || snapshot.status === 'reloading') {
        timeoutId = setTimeout(() => {
          debounced.set(snapshot);
        }, delayMs);
      } else {
        debounced.set(snapshot);
      }
    },
    { injector },
  );

  const derived = linkedSignal<ResourceSnapshot<T>, ResourceSnapshot<T>>({
    source: debounced,
    computation: (snapshot, previous) => {
      const isLoading = snapshot.status === 'loading' || snapshot.status === 'reloading';
      const prevSnapshot = previous?.value;

      if (isLoading && prevSnapshot && prevSnapshot.status !== 'error') {
        const prevValue = (prevSnapshot as { value: T }).value;
        if (prevValue !== undefined) {
          return { status: snapshot.status, value: prevValue } as ResourceSnapshot<T>;
        }
      }

      return snapshot;
    },
  });

  // Lê o sinal uma vez para estabelecer o baseline de `previous`
  derived();

  return resourceFromSnapshots(derived);
}
