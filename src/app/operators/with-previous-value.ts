import {
  linkedSignal,
  Resource,
  ResourceSnapshot,
  resourceFromSnapshots,
} from '@angular/core';

export function withPreviousValue<T>(input: Resource<T>): Resource<T> {
  const derived = linkedSignal<ResourceSnapshot<T>, ResourceSnapshot<T>>({
    source: input.snapshot,
    computation: (snapshot, previous) => {
      const isLoading = snapshot.status === 'loading' || snapshot.status === 'reloading';
      const prevSnapshot = previous?.value;

      if (isLoading && prevSnapshot && prevSnapshot.status !== 'error') {
        return {
          status: snapshot.status,
          value: (prevSnapshot as { value: T }).value,
        } as ResourceSnapshot<T>;
      }

      return snapshot;
    },
  });

  // Lê o sinal uma vez para estabelecer o baseline de `previous`
  // sem isso, o primeiro loading não tem valor anterior para preservar
  derived();

  return resourceFromSnapshots(derived);
}
