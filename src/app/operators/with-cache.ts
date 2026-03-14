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

export interface CacheOptions {
  key: string;
  ttl?: number;
}

interface CacheEntry<T> {
  snapshot: ResourceSnapshot<T>;
  timestamp: number;
}

const globalCache = new Map<string, CacheEntry<unknown>>();

/** Limpa o cache global. Útil em testes para isolar execuções. */
export function clearGlobalCache(): void {
  globalCache.clear();
}

export function withCache<T>(input: Resource<T>, options: CacheOptions): Resource<T> {
  const { key, ttl = 30000 } = options;
  const injector = inject(Injector);

  const cachedSnapshot = signal<ResourceSnapshot<T> | null>(null);

  // Inicializa a partir do cache existente se ainda estiver válido
  const existing = globalCache.get(key) as CacheEntry<T> | undefined;
  if (existing && Date.now() - existing.timestamp < ttl) {
    cachedSnapshot.set(existing.snapshot);
  }

  effect(
    () => {
      const snapshot = input.snapshot();

      if (snapshot.status === 'resolved' || snapshot.status === 'local') {
        const entry: CacheEntry<T> = { snapshot, timestamp: Date.now() };
        globalCache.set(key, entry as CacheEntry<unknown>);
        cachedSnapshot.set(snapshot);
      }
    },
    { injector },
  );

  const derived = linkedSignal<ResourceSnapshot<T>, ResourceSnapshot<T>>({
    source: input.snapshot,
    computation: (snapshot) => {
      if (snapshot.status === 'loading' || snapshot.status === 'reloading') {
        const cached = cachedSnapshot();
        if (cached) return cached;
      }
      return snapshot;
    },
  });

  return resourceFromSnapshots(derived);
}
